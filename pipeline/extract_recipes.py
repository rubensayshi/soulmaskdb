"""
Extract recipe data from all BP_PeiFang Blueprint assets via UE4 Python API.

Run inside modkit:
  "C:/Program Files/Epic Games/SoulMaskModkit/Engine/Binaries/Win64/UE4Editor-Cmd.exe"
    "C:/Program Files/Epic Games/SoulMaskModkit/Projects/WS/WS.uproject"
    -ExecutePythonScript="C:/Users/ruben/OneDrive/Documenten/Projects/SoulmaskDB/extract_recipes.py"
    -stdout -FullStdOutLogOutput -unattended -nopause

Output: C:/Users/ruben/OneDrive/Documenten/Projects/SoulmaskDB/Game/Exports/recipes_raw.json
"""

import unreal
import json
import os

OUTPUT_PATH = "C:/Users/ruben/OneDrive/Documenten/Projects/SoulmaskDB/Game/Exports/recipes_raw.json"
PEIFANG_ROOT = "/Game/Blueprints/PeiFang"

# Properties discovered from FName table analysis of BP_PeiFang uassets
CDO_PROPS = [
    "ZhiZuoDemandDaoJu",       # input items (primary)
    "ProduceDaoJu",             # output item class ref
    "PeiFangMakeTime",          # craft time (seconds)
    "MakeProficiencyType",      # proficiency skill type
    "MakeCompleteAddExp",       # XP awarded on completion
    "MakeAddProficiencyExp",    # proficiency XP added
    "GongZuoTaiName",           # crafting station name
    "NeedGongZuoTaiLevel",      # station level required
    "NeedKaiQiGongZuoTaiToMake", # must activate station
    "ExtraSupportMakeByHand",   # can craft by hand
    "PeiFangName",              # recipe display name
    "PeiFangBrief",             # recipe description
    "PeiFangUniqueID",          # unique numeric ID
    "MakeRandPinZhiData",       # output quality randomization
    "MatchGongZuoTaiData",      # station matching data
    "MustMatchGongZuoTaiList",  # required station list
    "NeedSpecialRanLiaoToMake", # requires special fuel
    "IsNotCalcChanLiangImprove", # ignore yield improvement
    "XiuLiXuYaoDaoJu",         # repair materials
    "PeiFangSLDShuaiJianData",  # durability decay data
    "PeiFangCorrespondGongZuoTaiData",  # station correspondence
    "PeiFangIcon",              # icon asset ref
]


def serialize(obj, depth=0):
    """Convert UE4 Python objects to JSON-serializable types."""
    if depth > 6:
        return "<max_depth>"
    if obj is None:
        return None
    if isinstance(obj, (bool, int, float, str)):
        return obj
    if isinstance(obj, (list, tuple)):
        return [serialize(v, depth + 1) for v in obj]
    if isinstance(obj, dict):
        return {k: serialize(v, depth + 1) for k, v in obj.items()}

    # For UE4 objects, try to get a string representation first
    type_name = type(obj).__name__

    # Handle common UE4 types
    result = {"__type__": type_name}

    # Try get_path_name for asset references
    if hasattr(obj, "get_path_name"):
        try:
            result["path"] = obj.get_path_name()
        except Exception:
            pass

    # Try to_tuple for structs like ranges
    if hasattr(obj, "lower_bound") and hasattr(obj, "upper_bound"):
        try:
            lb = obj.lower_bound
            ub = obj.upper_bound
            result["lower"] = {"type": str(lb.type), "value": lb.value}
            result["upper"] = {"type": str(ub.type), "value": ub.value}
            return result
        except Exception:
            pass

    # Try dir()-based property enumeration
    try:
        attrs = [a for a in dir(obj) if not a.startswith("_")]
        for attr in attrs[:60]:
            try:
                val = getattr(obj, attr)
                if callable(val):
                    continue
                result[attr] = serialize(val, depth + 1)
            except Exception as e:
                result[attr] = "<err: {}>".format(str(e)[:40])
    except Exception:
        result["__str__"] = str(obj)[:200]

    return result


def read_cdo_props(cdo):
    """Read all known recipe properties from a CDO."""
    data = {}
    for prop in CDO_PROPS:
        try:
            val = cdo.get_editor_property(prop)
            data[prop] = serialize(val)
        except Exception as e:
            # Property doesn't exist on this class or not accessible
            err = str(e)
            if "does not have a property" not in err and "not found" not in err.lower():
                data[prop] = "<err: {}>".format(err[:80])
    return data


def get_cdo(asset_path):
    """Load a Blueprint and return its Class Default Object."""
    bp = unreal.load_asset(asset_path)
    if bp is None:
        return None, "load_asset returned None"

    # Method 1: generated_class().get_default_object()
    if hasattr(bp, "generated_class"):
        try:
            gen_class = bp.generated_class()
            if gen_class and hasattr(gen_class, "get_default_object"):
                cdo = gen_class.get_default_object()
                if cdo:
                    return cdo, None
        except Exception as e:
            pass

    # Method 2: direct CDO path load
    try:
        asset_name = asset_path.split("/")[-1]
        cdo_path = asset_path + ".Default__" + asset_name + "_C"
        cdo = unreal.load_object(None, cdo_path)
        if cdo:
            return cdo, None
    except Exception as e:
        pass

    return None, "CDO not accessible"


def find_peifang_assets():
    """List all BP_PeiFang blueprint assets."""
    registry = unreal.AssetRegistryHelpers.get_asset_registry()
    ar_filter = unreal.ARFilter(
        package_paths=[PEIFANG_ROOT],
        recursive_paths=True,
        class_names=["Blueprint"],
    )
    found = registry.get_assets(ar_filter)
    paths = []
    for asset_data in found:
        pkg = str(asset_data.package_name)
        name = str(asset_data.asset_name)
        # Skip the component blueprint
        if "PeiFangComponent" not in name and "GameFunction" not in pkg:
            paths.append(pkg)
    return sorted(paths)


def main():
    print("=" * 80)
    print("SOULMASK RECIPE EXTRACTOR")
    print("=" * 80)

    assets = find_peifang_assets()
    print("Found {} recipe blueprints".format(len(assets)))

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    results = []
    errors = []
    no_props = 0

    for i, asset_path in enumerate(assets):
        if i % 100 == 0:
            print("  Progress: {}/{}".format(i, len(assets)))

        cdo, err = get_cdo(asset_path)
        if cdo is None:
            errors.append({"path": asset_path, "error": err})
            continue

        props = read_cdo_props(cdo)
        if not props:
            no_props += 1

        results.append({
            "path": asset_path,
            "name": asset_path.split("/")[-1],
            "props": props,
        })

    print("\nDone: {} extracted, {} errors, {} with no props".format(
        len(results), len(errors), no_props))

    # Write output
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(
            {"assets": results, "errors": errors},
            f,
            indent=2,
            default=lambda o: "<{}>".format(type(o).__name__),
        )
    print("Written to: {}".format(OUTPUT_PATH))

    # Print a sample to verify data
    if results:
        sample = results[0]
        print("\nSample: {}".format(sample["name"]))
        for k, v in sample["props"].items():
            if v is not None and not str(v).startswith("<err"):
                print("  {}: {}".format(k, str(v)[:120]))


if __name__ == "__main__":
    main()
