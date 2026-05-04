"""
Offline .uasset parser for BP_PeiFang recipe Blueprints.
Extracts recipe data directly from binary files — no UE4 editor required.

Confirmed binary layout (UE4.27 / LegacyFileVersion=-7 / FileVersionUE4=522):
  FPropertyTag header:
    FName PropName  (2 × int32 = 8 bytes)
    FName TypeName  (2 × int32 = 8 bytes)
    int32 Size      (4 bytes — NOT int64)
    int32 ArrayIdx  (4 bytes)
    [type extras]   (varies: see TYPE_EXTRAS below)
    bool HasGuid    (1 byte)
    [FGuid 16 bytes, only if HasGuid]
  then Size bytes of value data.

Usage:
  python parse_uasset_recipes.py

Output:
  Game/Exports/recipes_raw.json
"""

import struct
import json
import os
import glob

PEIFANG_ROOT = "C:/Program Files/Epic Games/SoulMaskModkit/Projects/WS/Content/Blueprints/PeiFang"
OUTPUT_PATH  = "C:/Users/ruben/OneDrive/Documenten/Projects/SoulmaskDB/Game/Exports/recipes_raw.json"


# ─── binary helpers ───────────────────────────────────────────────────────────

class Reader:
    def __init__(self, data):
        self.data = data
        self.pos  = 0

    def seek(self, p): self.pos = p
    def tell(self):    return self.pos

    def read(self, n):
        v = self.data[self.pos:self.pos + n]
        self.pos += n
        return v

    def i32(self):
        v, = struct.unpack_from("<i", self.data, self.pos); self.pos += 4; return v
    def u32(self):
        v, = struct.unpack_from("<I", self.data, self.pos); self.pos += 4; return v
    def i64(self):
        v, = struct.unpack_from("<q", self.data, self.pos); self.pos += 8; return v
    def f32(self):
        v, = struct.unpack_from("<f", self.data, self.pos); self.pos += 4; return v
    def u8(self):
        v = self.data[self.pos]; self.pos += 1; return v

    def fname_pair(self):
        """Read FName as (index, number) — 8 bytes."""
        return self.i32(), self.i32()

    def fstring(self):
        length = self.i32()
        if length == 0:
            return ""
        if length > 0:
            s = self.data[self.pos:self.pos + length - 1].decode("utf-8", errors="replace")
            self.pos += length
            return s
        else:
            bl = abs(length) * 2
            s = self.data[self.pos:self.pos + bl - 2].decode("utf-16-le", errors="replace")
            self.pos += bl
            return s


# ─── uasset header + tables ───────────────────────────────────────────────────

def parse_header(r):
    """Parse file header; return (names, imports, exports)."""
    magic = r.u32()
    assert magic == 0x9E2A83C1
    r.i32()   # LegacyFileVersion
    r.i32()   # LegacyUE3Version
    r.i32()   # FileVersionUE4
    r.i32()   # FileVersionLicenseeUE4
    cv = r.i32()
    r.read(cv * 20)           # CustomVersionContainer

    r.i32()                   # TotalHeaderSize
    r.fstring()               # FolderName
    r.u32()                   # PackageFlags

    name_count  = r.i32()
    name_offset = r.i32()
    r.fstring()               # LocalizationId (present in this build after name fields)
    r.i32(); r.i32()          # GatherableTextDataCount / Offset
    export_count  = r.i32()
    export_offset = r.i32()
    import_count  = r.i32()
    import_offset = r.i32()

    # ── name table ────────────────────────────────────────────────────────────
    r.seek(name_offset)
    names = []
    for _ in range(name_count):
        names.append(r.fstring())
        r.read(4)   # hash

    def fn(idx, num=0):
        if idx < 0 or idx >= len(names):
            return "<bad:{}>".format(idx)
        s = names[idx]
        return s if num == 0 else "{}_{}".format(s, num - 1)

    # ── import table ──────────────────────────────────────────────────────────
    # FObjectImport in UE4.27 (ver>=VER_UE4_NON_OUTER_PACKAGE_IMPORT ~519):
    #   ClassPackage(FName=8) + ClassName(FName=8) + OuterIndex(i32=4)
    #   + ObjectName(FName=8) + ImportedPackageName(FName=8) = 36 bytes
    r.seek(import_offset)
    imports = []
    for _ in range(import_count):
        class_pkg  = fn(*r.fname_pair())
        class_name = fn(*r.fname_pair())
        outer_idx  = r.i32()
        obj_name   = fn(*r.fname_pair())
        r.fname_pair()   # ImportedPackageName (ignore)
        imports.append((class_pkg, class_name, outer_idx, obj_name))

    def pkg_path(pkg_idx):
        """FPackageIndex → /Game/... asset path string."""
        if pkg_idx == 0:
            return None
        if pkg_idx > 0:
            return "<export:{}>".format(pkg_idx)
        i = -pkg_idx - 1
        if i >= len(imports):
            return "<bad_import:{}>".format(i)
        _, _, outer, obj_name = imports[i]
        if outer < 0:
            oi = -outer - 1
            if oi < len(imports):
                return imports[oi][3]   # package path of outer
        return obj_name

    # ── export table ──────────────────────────────────────────────────────────
    # FObjectExport = 104 bytes (confirmed empirically):
    #   ClassIndex(4) SuperIndex(4) TemplateIndex(4) OuterIndex(4)
    #   ObjectName.idx(4) ObjectName.num(4) ObjectFlags(4)
    #   SerialSize(i64=8) SerialOffset(i64=8)
    #   bForcedExport(4) bNotForClient(4) bNotForServer(4)
    #   PackageGuid(16) PackageFlags(4)
    #   bNotAlwaysLoaded(4) bIsAsset(4)
    #   5 dependency int32s (20)
    r.seek(export_offset)
    exports = []
    for _ in range(export_count):
        r.i32(); r.i32(); r.i32(); r.i32()   # class/super/template/outer
        obj_name = fn(*r.fname_pair())
        r.i32()                               # ObjectFlags
        serial_size   = r.i64()
        serial_offset = r.i64()
        r.i32(); r.i32(); r.i32()            # bool fields
        r.read(16)                            # PackageGuid
        r.u32()                               # PackageFlags
        r.i32(); r.i32()                      # bNotAlwaysLoaded, bIsAsset
        r.i32(); r.i32(); r.i32(); r.i32(); r.i32()  # dependency counts
        exports.append((obj_name, serial_size, serial_offset))

    return fn, names, imports, pkg_path, exports


# ─── tagged property parser ───────────────────────────────────────────────────

def read_tagged_props(r, end, fn, pkg_path, depth=0):
    """
    Read a sequence of tagged UE4 properties until 'None' or EOF.

    FPropertyTag layout (confirmed UE4.27):
      FName PropName  (8 bytes)
      FName TypeName  (8 bytes)
      int32 Size      (4 bytes)
      int32 ArrayIdx  (4 bytes)
      [type extras]
      bool  HasGuid   (1 byte)
      [FGuid 16 bytes if HasGuid]
      [Size bytes of value]
    """
    props = {}

    while r.pos < end - 8:
        pname_idx, pname_num = r.fname_pair()
        pname = fn(pname_idx, pname_num)

        if pname == "None":
            break

        ptype_idx, ptype_num = r.fname_pair()
        ptype = fn(ptype_idx)

        size      = r.i32()
        arr_index = r.i32()

        # ── type-specific extras (between ArrayIndex and HasGuid) ─────────────
        bool_val    = None
        inner_type  = None
        struct_type = None
        enum_name   = None

        if ptype == "BoolProperty":
            bool_val = bool(r.u8())

        elif ptype in ("ByteProperty", "EnumProperty"):
            enum_name = fn(*r.fname_pair())

        elif ptype == "StructProperty":
            struct_type = fn(*r.fname_pair())
            r.read(16)   # struct FGuid tag

        elif ptype == "ArrayProperty":
            inner_type = fn(*r.fname_pair())

        elif ptype == "SetProperty":
            inner_type  = fn(*r.fname_pair())

        elif ptype == "MapProperty":
            inner_type = fn(*r.fname_pair())
            enum_name  = fn(*r.fname_pair())

        # ── HasPropertyGuid ───────────────────────────────────────────────────
        has_guid = r.u8()
        if has_guid:
            r.read(16)

        # ── value ─────────────────────────────────────────────────────────────
        val_start = r.pos
        if bool_val is not None:
            value = bool_val
        else:
            try:
                value = read_value(r, ptype, size, bool_val, inner_type,
                                   struct_type, enum_name, fn, pkg_path, depth)
            except Exception as e:
                value = "<err:{}>".format(str(e)[:60])
        r.seek(val_start + size)   # always advance exactly Size bytes

        # collect
        if arr_index > 0:
            props.setdefault(pname, {})[arr_index] = value
        elif pname in props:
            if not isinstance(props[pname], list):
                props[pname] = [props[pname]]
            props[pname].append(value)
        else:
            props[pname] = value

    return props


def read_value(r, ptype, size, bool_val, inner_type, struct_type, enum_name,
               fn, pkg_path, depth=0):

    if ptype == "ObjectProperty":
        return pkg_path(r.i32())

    elif ptype == "IntProperty":
        return r.i32()

    elif ptype == "FloatProperty":
        return r.f32()

    elif ptype == "BoolProperty":
        return bool_val

    elif ptype in ("ByteProperty", "EnumProperty"):
        if size == 1:
            return r.u8()
        else:
            return fn(*r.fname_pair())

    elif ptype == "NameProperty":
        idx, num = r.fname_pair()
        return fn(idx, num)

    elif ptype == "StrProperty":
        return r.fstring()

    elif ptype == "TextProperty":
        return read_ftext(r, size)

    elif ptype == "StructProperty":
        return read_struct_value(r, struct_type, size, fn, pkg_path, depth)

    elif ptype == "ArrayProperty":
        return read_array_value(r, size, inner_type, fn, pkg_path, depth)

    else:
        return r.read(size).hex()


def read_ftext(r, size):
    """Read FText — returns the source string if available."""
    start = r.pos
    try:
        flags = r.i32()
        history = r.i32()   # EStringTableLoadingPhase::ETextHistoryType stored as i8+i24 in some vers
        # Actually history is serialized as int8 extended to int (or uint8)
        # Rewind and re-read as int8 + then 3 bytes
        r.seek(start + 4)
        history = struct.unpack_from("<b", r.data, r.pos)[0]
        r.pos += 1

        if history == -1:   # FTextHistory::None
            has_str = r.i32()
            if has_str:
                return r.fstring()
            return None
        elif history == 0:  # FTextHistory::Base
            namespace = r.fstring()
            key       = r.fstring()
            src       = r.fstring()
            return src or key
        elif history == 11: # FTextHistory::StringTableEntry
            r.fstring()  # table id
            r.fstring()  # key
            return None
        else:
            pass
    except Exception:
        pass
    r.seek(start + size)
    return None


def read_struct_value(r, struct_type, size, fn, pkg_path, depth):
    """Read a struct value; parse known structs, hex-dump others."""
    start = r.pos
    try:
        if struct_type == "Int32Range":
            lb_type  = r.u8(); lb_val = r.i32()
            ub_type  = r.u8(); ub_val = r.i32()
            return {"min": lb_val, "max": ub_val}
        elif struct_type == "Int32RangeBound":
            btype = r.u8(); val = r.i32()
            return {"type": btype, "value": val}
        elif struct_type == "Guid":
            return r.read(16).hex()
        else:
            # Try parsing as nested tagged props (works for struct CDOs)
            if depth < 3 and size > 8:
                end = r.pos + size
                nested = read_tagged_props(r, end, fn, pkg_path, depth + 1)
                r.seek(end)
                return nested if nested else r.data[start:start + size].hex()
    except Exception:
        pass
    r.seek(start + size)
    return r.data[start:start + size].hex()


def read_array_value(r, size, inner_type, fn, pkg_path, depth):
    """Read ArrayProperty value: int32 count + elements."""
    start = r.pos
    count = r.i32()
    items = []
    if count == 0 or size <= 4:
        return items

    payload = size - 4
    per_item = payload // count if count > 0 else 0

    for _ in range(count):
        item_start = r.pos
        try:
            if inner_type == "ObjectProperty":
                items.append(pkg_path(r.i32()))
            elif inner_type == "IntProperty":
                items.append(r.i32())
            elif inner_type == "FloatProperty":
                items.append(r.f32())
            elif inner_type == "NameProperty":
                items.append(fn(*r.fname_pair()))
            elif inner_type == "StrProperty":
                items.append(r.fstring())
            elif inner_type == "StructProperty":
                # Structs inside arrays: no tag headers, read as nested props
                if depth < 3 and per_item > 8:
                    end = r.pos + per_item
                    nested = read_tagged_props(r, end, fn, pkg_path, depth + 1)
                    r.seek(item_start + per_item)
                    items.append(nested)
                else:
                    items.append(r.read(per_item).hex())
            else:
                items.append(r.read(per_item).hex() if per_item > 0 else None)
        except Exception as e:
            r.seek(item_start + per_item)
            items.append("<err:{}>".format(str(e)[:40]))

    return items


# ─── main asset parser ────────────────────────────────────────────────────────

def parse_recipe_asset(path):
    with open(path, "rb") as f:
        data = f.read()

    r = Reader(data)
    fn, names, imports, pkg_path, exports = parse_header(r)

    # Find CDO export (name starts with "Default__")
    cdo = None
    for obj_name, sz, off in exports:
        if obj_name.startswith("Default__"):
            cdo = (obj_name, sz, off)
            break

    if cdo is None:
        return {}

    _, cdo_size, cdo_offset = cdo
    r.seek(cdo_offset)
    end = cdo_offset + cdo_size

    return read_tagged_props(r, end, fn, pkg_path)


# ─── batch processing ─────────────────────────────────────────────────────────

def find_assets():
    pattern = os.path.join(PEIFANG_ROOT, "**", "*.uasset")
    all_files = glob.glob(pattern, recursive=True)
    return sorted(f for f in all_files if "PeiFangComponent" not in f)


def game_path(fs_path):
    marker = "/Content/"
    idx = fs_path.replace("\\", "/").find(marker)
    if idx == -1:
        return fs_path
    rel = fs_path[idx + len(marker):].replace("\\", "/").rsplit(".", 1)[0]
    return "/Game/" + rel


def main():
    assets = find_assets()
    print("Found {} recipe uasset files".format(len(assets)))

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    results = []
    errors  = []
    no_props = 0

    for i, fs_path in enumerate(assets):
        if i % 100 == 0:
            print("  {}/{} {}".format(i, len(assets), os.path.basename(fs_path)))
        gp = game_path(fs_path)
        try:
            props = parse_recipe_asset(fs_path)
            if not props:
                no_props += 1
            results.append({"path": gp, "props": props})
        except Exception as e:
            errors.append({"path": gp, "error": str(e)})

    print("\nDone: {} ok  {} errors  {} no-props".format(
        len(results), len(errors), no_props))

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump({"assets": results, "errors": errors}, f,
                  indent=2, ensure_ascii=False)
    print("Written: {}".format(OUTPUT_PATH))

    # Print sample
    for rec in results[:3]:
        if rec["props"]:
            print("\n--- {} ---".format(rec["path"].split("/")[-1]))
            for k, v in rec["props"].items():
                print("  {}: {}".format(k, str(v)[:120]))


if __name__ == "__main__":
    main()
