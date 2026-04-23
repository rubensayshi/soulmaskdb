"""
Parse GameEffect (GE) blueprints for food and drug buff data, then
enrich items.json with structured buff information.

Input:
  uasset_export/Blueprints/GAS/GE/Food/**/*.json.gz   (food GEs)
  uasset_export/Blueprints/GAS/GE/Drug/**/*.json.gz   (drug/potion GEs)
  uasset_export/Blueprints/DaoJu/DaoJuShiWu/**/*.json.gz  (food items)
  uasset_export/Blueprints/DaoJu/DaoJuYaoPin/**/*.json.gz  (potion items)
  Game/Parsed/items.json  (existing parsed items)

Output:
  Game/Parsed/items.json  (enriched with buffs field)
"""

import gzip
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
GE_FOOD_DIR = REPO_ROOT / "uasset_export" / "Blueprints" / "GAS" / "GE" / "Food"
GE_DRUG_DIR = REPO_ROOT / "uasset_export" / "Blueprints" / "GAS" / "GE" / "Drug"
FOOD_ITEMS_DIR = REPO_ROOT / "uasset_export" / "Blueprints" / "DaoJu" / "DaoJuShiWu"
POTION_ITEMS_DIR = REPO_ROOT / "uasset_export" / "Blueprints" / "DaoJu" / "DaoJuYaoPin"
ITEMS_JSON = REPO_ROOT / "Game" / "Parsed" / "items.json"

ATTRIBUTE_NAMES = {
    "Attack": "attack",
    "ChengZhangExpRate": "growth_exp_rate",
    "Crit": "crit_chance",
    "CritDamageInc": "crit_damage",
    "CritDef": "crit_defense",
    "CurMaxJingShen": "max_awareness",
    "Damage": "damage",
    "DamageInc": "damage_increase",
    "Defense": "defense",
    "Du": "poison",
    "DuKang": "poison_resistance",
    "Food": "food",
    "FoodConsume": "food_consumption",
    "FoodConsumePctTiLiRecover": "food_stamina_recovery",
    "FuShe": "radiation",
    "GuoShuValue": "fruit_preference",
    "HanKang": "cold_resistance",
    "Healing": "healing",
    "HealthRecover": "health_regen",
    "HuXi": "oxygen",
    "JingShen": "awareness",
    "MaxFood": "max_food",
    "MaxFuZhong": "max_carry_weight",
    "MaxHealth": "max_health",
    "MaxTiLi": "max_stamina",
    "MaxWater": "max_water",
    "RouShiValue": "meat_preference",
    "SpeedRate": "speed",
    "TiLi": "stamina",
    "TiLiRecover": "stamina_regen",
    "Water": "water",
    "WaterConsume": "water_consumption",
    "WaterConsumePctTiLiRecover": "water_stamina_recovery",
    "WenDuSanRe": "heat_dissipation",
    "XinQing": "mood",
    "YanDamageDec": "heat_damage_reduction",
    "YanKang": "heat_resistance",
    "ZhuShiValue": "staple_preference",
    "DuDamageDec": "poison_damage_reduction",
    "HanDamageDec": "cold_damage_reduction",
}

OP_NAMES = {
    "EGameplayModOp::Additive": "add",
    "EGameplayModOp::Multiplicitive": "multiply",
    "EGameplayModOp::Division": "divide",
    "EGameplayModOp::Override": "override",
}


def find_props(exports):
    for exp in exports or []:
        if not isinstance(exp, dict):
            continue
        for prop in exp.get("Data") or []:
            if isinstance(prop, dict):
                yield prop.get("Name"), prop


def get_cdo_props(data):
    """Get properties from the Default__ (CDO) export."""
    for exp in data.get("Exports", []):
        if "Default__" in exp.get("ObjectName", ""):
            return {p.get("Name"): p for p in exp.get("Data", [])}
    return {}


def get_ui_data(data):
    """Extract buff name and description from HGEUIDataBuffXinXi export."""
    for exp in data.get("Exports", []):
        name = exp.get("ObjectName", "")
        if "HGEUIDataBuffXinXi" in name or "UIData" in name.replace("_", ""):
            props = {}
            for prop in exp.get("Data", []):
                n = prop.get("Name", "")
                if n in ("BuffMing", "BuffMiaoShu"):
                    props[n] = prop.get("CultureInvariantString")
                elif n == "BuffTu":
                    for sub in prop.get("Value", []):
                        if sub.get("Name") == "ResourceObject":
                            props["icon_ref"] = sub.get("Value")
            if props:
                return props
    return {}


def extract_scalable_float(prop):
    """Extract float value from a ScalableFloat struct."""
    for sub in prop.get("Value", []):
        if sub.get("Name") == "Value":
            v = sub.get("Value")
            if isinstance(v, str):
                try:
                    return float(v)
                except ValueError:
                    return 0.0
            return v
    return None


def parse_ge_file(filepath):
    """Parse a single GameEffect blueprint, return structured buff data."""
    with gzip.open(filepath, "rt", encoding="utf-8") as f:
        data = json.load(f)

    ge_id = filepath.name.replace(".json.gz", "")
    props = get_cdo_props(data)
    if not props:
        return None

    duration_policy = None
    dp = props.get("DurationPolicy")
    if dp:
        v = dp.get("Value", "")
        if "::" in v:
            duration_policy = v.split("::")[-1]

    duration_seconds = None
    dm = props.get("DurationMagnitude")
    if dm:
        for sub in dm.get("Value", []):
            if sub.get("Name") == "ScalableFloatMagnitude":
                duration_seconds = extract_scalable_float(sub)

    period_seconds = None
    per = props.get("Period")
    if per:
        for sub in per.get("Value", []):
            if sub.get("Name") == "ScalableFloatMagnitude":
                period_seconds = extract_scalable_float(sub)

    stacking = None
    st = props.get("StackingType")
    if st:
        v = st.get("Value", "")
        if "::" in v:
            stacking = v.split("::")[-1]

    stack_limit = None
    sl = props.get("StackLimitCount")
    if sl:
        stack_limit = sl.get("Value")

    modifiers = []
    mod_prop = props.get("Modifiers")
    if mod_prop and mod_prop.get("Value"):
        for mod in mod_prop["Value"]:
            attr_name = None
            op = None
            magnitude = None
            is_computed = False
            for v in mod.get("Value", []):
                vn = v.get("Name", "")
                if vn == "Attribute":
                    for av in v.get("Value", []):
                        if av.get("Name") == "AttributeName":
                            attr_name = av.get("Value")
                elif vn == "ModifierOp":
                    raw_op = v.get("EnumValue", "")
                    op = OP_NAMES.get(raw_op, raw_op.split("::")[-1] if "::" in raw_op else raw_op)
                elif vn == "ModifierMagnitude":
                    for mv in v.get("Value", []):
                        if mv.get("Name") == "MagnitudeCalculationType":
                            calc = mv.get("Value", "")
                            if "CustomCalculationClass" in calc:
                                is_computed = True
                        elif mv.get("Name") == "ScalableFloatMagnitude":
                            magnitude = extract_scalable_float(mv)
            if attr_name:
                entry = {
                    "attribute": ATTRIBUTE_NAMES.get(attr_name, attr_name),
                    "attribute_raw": attr_name,
                    "op": op or "add",
                }
                if is_computed:
                    entry["value"] = None
                    entry["computed"] = True
                else:
                    entry["value"] = round(magnitude, 4) if magnitude is not None else None
                modifiers.append(entry)

    has_execution = bool(props.get("Executions", {}).get("Value"))

    ui = get_ui_data(data)

    result = {
        "ge_id": ge_id,
        "duration_policy": duration_policy,
        "duration_seconds": duration_seconds,
        "modifiers": modifiers if modifiers else None,
        "has_custom_execution": has_execution,
    }
    if period_seconds:
        result["period_seconds"] = period_seconds
    if stacking:
        result["stacking"] = stacking
    if stack_limit is not None:
        result["stack_limit"] = stack_limit
    if ui.get("BuffMing"):
        result["buff_name_zh"] = ui["BuffMing"]
    if ui.get("BuffMiaoShu"):
        result["buff_desc_zh"] = ui["BuffMiaoShu"]

    return result


def resolve_import_path(imports, ref):
    if ref is None or ref >= 0:
        return None
    idx = -ref - 1
    if idx >= len(imports):
        return None
    imp = imports[idx]
    outer = imp.get("OuterIndex", 0)
    if outer == 0:
        return imp.get("ObjectName")
    pkg_idx = -outer - 1
    if pkg_idx < 0 or pkg_idx >= len(imports):
        return None
    return imports[pkg_idx].get("ObjectName")


def extract_ge_refs_from_item(filepath):
    """Extract GE IDs referenced by a food/potion item via UserGEList."""
    with gzip.open(filepath, "rt", encoding="utf-8") as f:
        data = json.load(f)

    imports = data.get("Imports", [])
    item_id = filepath.name.replace(".json.gz", "")

    for exp in data.get("Exports", []):
        if "Default__" not in exp.get("ObjectName", ""):
            continue
        for prop in exp.get("Data", []):
            if prop.get("Name") != "UserGEList":
                continue
            ge_ids = []
            for entry in prop.get("Value", []):
                ref = entry.get("Value")
                if ref is None or ref >= 0:
                    continue
                idx = -ref - 1
                if idx >= len(imports):
                    continue
                imp = imports[idx]
                obj_name = imp.get("ObjectName", "")
                # Strip _C suffix (BlueprintGeneratedClass name → blueprint name)
                if obj_name.endswith("_C"):
                    obj_name = obj_name[:-2]
                ge_ids.append(obj_name)
            return item_id, ge_ids

    return item_id, []


def main():
    # Step 1: Parse all GE files
    ge_dirs = []
    if GE_FOOD_DIR.exists():
        ge_dirs.append(GE_FOOD_DIR)
    if GE_DRUG_DIR.exists():
        ge_dirs.append(GE_DRUG_DIR)

    ge_files = []
    for d in ge_dirs:
        ge_files.extend(sorted(d.rglob("*.json.gz")))

    print(f"Found {len(ge_files)} GameEffect files")

    ge_data = {}
    ge_errors = []
    for fp in ge_files:
        try:
            ge = parse_ge_file(fp)
            if ge:
                ge_data[ge["ge_id"]] = ge
        except Exception as e:
            ge_errors.append({"file": str(fp), "error": str(e)})

    print(f"  Parsed: {len(ge_data)}")
    print(f"  Errors: {len(ge_errors)}")

    with_modifiers = sum(1 for g in ge_data.values() if g["modifiers"])
    with_execution = sum(1 for g in ge_data.values() if g["has_custom_execution"])
    with_buff_name = sum(1 for g in ge_data.values() if g.get("buff_name_zh"))
    print(f"  With modifiers: {with_modifiers}")
    print(f"  With custom execution (not extractable): {with_execution}")
    print(f"  With buff name: {with_buff_name}")

    # Collect all unique attributes
    all_attrs = set()
    for g in ge_data.values():
        for m in g.get("modifiers") or []:
            all_attrs.add(f"{m['attribute_raw']} → {m['attribute']}")
    print(f"\nAttribute mapping ({len(all_attrs)}):")
    for a in sorted(all_attrs):
        print(f"  {a}")

    # Step 2: Extract item → GE refs
    item_dirs = []
    if FOOD_ITEMS_DIR.exists():
        item_dirs.append(FOOD_ITEMS_DIR)
    if POTION_ITEMS_DIR.exists():
        item_dirs.append(POTION_ITEMS_DIR)

    item_files = []
    for d in item_dirs:
        item_files.extend(sorted(d.rglob("*.json.gz")))

    print(f"\nFound {len(item_files)} food/potion item files")

    item_ge_map = {}
    for fp in item_files:
        try:
            item_id, ge_ids = extract_ge_refs_from_item(fp)
            if ge_ids:
                item_ge_map[item_id] = ge_ids
        except Exception as e:
            ge_errors.append({"file": str(fp), "error": str(e)})

    print(f"  Items with GE refs: {len(item_ge_map)}")

    # Step 3: Build resolved buff data per item
    item_buffs = {}
    unresolved = set()
    for item_id, ge_ids in item_ge_map.items():
        effects = []
        for ge_id in ge_ids:
            ge = ge_data.get(ge_id)
            if not ge:
                unresolved.add(ge_id)
                continue
            effects.append(ge)
        if effects:
            item_buffs[item_id] = effects

    if unresolved:
        print(f"\n  Unresolved GE refs ({len(unresolved)}):")
        for u in sorted(unresolved):
            print(f"    {u}")

    # Step 4: Enrich items.json
    with open(ITEMS_JSON, "r", encoding="utf-8") as f:
        items = json.load(f)

    enriched = 0
    for item in items:
        effects = item_buffs.get(item["id"])
        if not effects:
            item["buffs"] = None
            continue

        # Merge all GE effects into a flat buff summary
        all_modifiers = []
        buff_name = None
        buff_desc = None
        total_duration = None
        has_unextractable = False

        for eff in effects:
            if eff.get("buff_name_zh") and not buff_name:
                buff_name = eff["buff_name_zh"]
            if eff.get("buff_desc_zh") and not buff_desc:
                buff_desc = eff["buff_desc_zh"]
            if eff.get("has_custom_execution"):
                has_unextractable = True

            dur = eff.get("duration_seconds")
            period = eff.get("period_seconds")
            is_burst = dur is not None and dur <= 60

            for mod in eff.get("modifiers") or []:
                # Skip modifiers from short-duration burst GEs (eating effects)
                # unless they're nutritional/preference attributes needed for classification
                if is_burst and mod["attribute"] not in (
                    "food", "water", "mood", "awareness",
                    "meat_preference", "fruit_preference", "staple_preference",
                ):
                    continue
                entry = {
                    "attribute": mod["attribute"],
                    "value": mod["value"],
                    "op": mod["op"],
                }
                if mod.get("computed"):
                    entry["computed"] = True
                if dur and dur > 60:
                    entry["duration_seconds"] = dur
                elif period:
                    entry["over_seconds"] = period
                all_modifiers.append(entry)

            # The "main" effect (non-common) typically has the longest duration
            if dur and dur > 60 and (total_duration is None or dur > total_duration):
                total_duration = dur

        buff = {"modifiers": all_modifiers}
        if buff_name:
            buff["buff_name_zh"] = buff_name
        if buff_desc:
            buff["buff_desc_zh"] = buff_desc
        if total_duration:
            buff["duration_seconds"] = total_duration
        if has_unextractable:
            buff["has_unextractable_effects"] = True

        item["buffs"] = buff
        enriched += 1

    print(f"\nEnriched {enriched} items with buff data")

    # Write back
    with open(ITEMS_JSON, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

    print(f"Updated: {ITEMS_JSON}")

    # Sample output
    print("\nSample buffed items:")
    for item in items:
        if not item.get("buffs") or not item["buffs"].get("modifiers"):
            continue
        b = item["buffs"]
        name = item.get("name_zh") or item["id"]
        mods = ", ".join(
            f"{m['attribute']} {'+' if m['op'] == 'add' else ''}{m['value']}"
            for m in b["modifiers"]
        )
        dur = f" ({b['duration_seconds']}s)" if b.get("duration_seconds") else ""
        print(f"  {name}: {mods}{dur}")
        if len([i for i in items if i.get("buffs") and i["buffs"].get("modifiers")]) > 10:
            break

    if ge_errors:
        err_path = ITEMS_JSON.parent / "food_buff_errors.json"
        with open(err_path, "w") as f:
            json.dump(ge_errors, f, indent=2)
        print(f"\nErrors written: {err_path}")


if __name__ == "__main__":
    main()
