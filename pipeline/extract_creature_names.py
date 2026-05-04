"""
Extract creature display names from UE4 localization PO files.

Scans for SourceLocation paths matching BP_DongWu_* and BP_Monster_*
blueprints, extracts the MoRenMingZi (default name) field translations.

Output: prints a JSON dict of { pinyin_key: english_name } to stdout
and writes data/translations/creature_names_po.json.
"""
import re
import os
import json
import sys

# Force UTF-8 output on Windows to handle Chinese characters in print statements
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

MODKIT_ROOT = r"C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS"
PO_FILES = [
    os.path.join(MODKIT_ROOT, "Content", "Localization", "Game", "en", "Game.po"),
    os.path.join(MODKIT_ROOT, "Content", "Localization", "Categories", "en", "Categories.po"),
    os.path.join(MODKIT_ROOT, "Content", "Localization", "Properties", "en", "Properties.po"),
]

SOURCE_RE  = re.compile(r"^#\.\s*SourceLocation:\s*(.+)$")
MSGID_RE   = re.compile(r'^msgid\s+"(.*)"$')
MSGSTR_RE  = re.compile(r'^msgstr\s+"(.*)"$')
MSGCTXT_RE = re.compile(r'^msgctxt\s+')

# Match creature blueprints:
#   /Game/Blueprints/DongWu/[SubDir/]BP_DongWu_<Name>[...].Default__..._C.MoRenMingZi
#   /Game/Blueprints/DongWu/[SubDir/]BP_Monster_<Name>[...].Default__..._C.MoRenMingZi
CREATURE_PATH_RE = re.compile(
    r"/(?:BP_DongWu_|BP_Monster_)([^/.]+)\.Default__[^.]+_C\.MoRenMingZi$"
)

# Suffixes that indicate a variant — strip to get the base Pinyin key.
# Base (no suffix) wins; variants are only recorded if no base entry exists.
VARIANT_SUFFIX_RE = re.compile(
    r"_(JY|Mu|Gong|YiJi|YiJi2|Boss|Elite|T\d+|EnemyMount|ShopMount|[A-Z]{2,})$"
)


def parse_po(filepath):
    """Yield (source_loc, msgid, msgstr) tuples from a PO file."""
    with open(filepath, encoding="utf-8-sig") as f:
        lines = f.readlines()

    source_loc = msgid = msgstr = None
    in_msgid = in_msgstr = False

    for line in lines:
        line = line.rstrip("\n")

        m = SOURCE_RE.match(line)
        if m:
            source_loc = m.group(1).strip()
            continue

        # msgctxt appears between source and msgid — just reset continuation state
        if MSGCTXT_RE.match(line):
            in_msgid = in_msgstr = False
            continue

        m = MSGID_RE.match(line)
        if m:
            in_msgid, in_msgstr = True, False
            msgid = m.group(1).replace('\\"', '"')
            continue

        m = MSGSTR_RE.match(line)
        if m:
            in_msgid, in_msgstr = False, True
            msgstr = m.group(1).replace('\\"', '"')
            continue

        # Continuation lines
        if line.startswith('"') and line.endswith('"'):
            val = line[1:-1].replace('\\"', '"')
            if in_msgid and msgid is not None:
                msgid += val
            elif in_msgstr and msgstr is not None:
                msgstr += val
            continue

        # Blank line → flush entry
        if not line.strip():
            if source_loc and msgid is not None and msgstr is not None:
                yield source_loc, msgid, msgstr
            source_loc = msgid = msgstr = None
            in_msgid = in_msgstr = False

    if source_loc and msgid is not None and msgstr is not None:
        yield source_loc, msgid, msgstr


def extract_creature_names():
    # Two passes: base entries (no variant suffix) win over variants.
    base = {}    # pinyin_key → english_name  (no suffix)
    variant = {} # pinyin_key → english_name  (has suffix, fallback)

    for po_path in PO_FILES:
        if not os.path.exists(po_path):
            print(f"  SKIP (not found): {po_path}")
            continue
        print(f"  Scanning: {po_path}")
        for source_loc, msgid, msgstr in parse_po(po_path):
            if not msgstr:
                continue
            m = CREATURE_PATH_RE.search(source_loc)
            if not m:
                continue
            bp_suffix = m.group(1)  # e.g. "BaoZi_JY", "DaYangTuo", "Xiong_YiJi"
            # Derive base key by stripping variant suffixes
            clean = VARIANT_SUFFIX_RE.sub("", bp_suffix)
            is_variant = clean != bp_suffix

            if is_variant:
                if clean not in variant:
                    variant[clean] = msgstr
                    print(f"    [variant] {clean} ({bp_suffix}) = {msgstr}  (zh: {msgid})")
            else:
                if clean not in base:
                    base[clean] = msgstr
                    print(f"    {clean} = {msgstr}  (zh: {msgid})")

    # Merge: base wins, variants fill gaps
    results = {**variant, **base}
    return results


if __name__ == "__main__":
    print("Extracting creature names from PO files...")
    names = extract_creature_names()
    print(f"\n{len(names)} creature names extracted")
    print("\n--- JSON output ---")
    print(json.dumps(names, indent=2, ensure_ascii=False))
    out_path = os.path.join(os.path.dirname(__file__), "..", "data", "translations", "creature_names_po.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(names, f, indent=2, ensure_ascii=False)
    print(f"\nWritten to {out_path}")
