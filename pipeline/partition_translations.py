"""
Partition translate_batch.yaml-equivalent data into chunk JSON files that
parallel translation subagents can consume. Writes to tasks/chunks/*.json.
Run once; chunk files are gitignored.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PARSED = ROOT / "Game" / "Parsed"
CHUNKS = ROOT / "tasks" / "chunks"
CHUNKS.mkdir(parents=True, exist_ok=True)

items = {i["id"]: i for i in json.loads((PARSED / "items.json").read_text(encoding="utf-8"))}
recipes = json.loads((PARSED / "recipes.json").read_text(encoding="utf-8"))

needed = set()
for r in recipes:
    if r.get("output"):
        needed.add(r["output"]["item_id"])
    for i in r.get("inputs") or []:
        needed.add(i["item_id"])

stations = {}
profs = set()
for r in recipes:
    if r.get("station_id"):
        stations.setdefault(r["station_id"], r.get("station_name"))
    if r.get("proficiency"):
        profs.add(r["proficiency"])

def make_item_entry(iid):
    it = items.get(iid, {})
    return {
        "key": f"item:{iid}",
        "id": iid,
        "zh": it.get("name_zh") or "",
        "desc_zh": it.get("description_zh") or "",
        "category": it.get("category") or "unknown",
        "subcategory": it.get("subcategory") or "",
    }

buckets = {
    "1_materials_processed": [],  # material + processed
    "2_weapons_tools":       [],  # weapon + tool
    "3_equipment_mask":      [],  # equipment + mask
    "4_rest":                [],  # everything else
}
for iid in sorted(needed):
    e = make_item_entry(iid)
    c = e["category"]
    if c in ("material", "processed"):
        buckets["1_materials_processed"].append(e)
    elif c in ("weapon", "tool"):
        buckets["2_weapons_tools"].append(e)
    elif c in ("equipment", "mask"):
        buckets["3_equipment_mask"].append(e)
    else:
        buckets["4_rest"].append(e)

for name, entries in buckets.items():
    (CHUNKS / f"{name}.json").write_text(
        json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"{name}: {len(entries)}")

station_list = [{"key": f"station:{sid}", "id": sid, "current": name or ""}
                for sid, name in sorted(stations.items())]
prof_list    = [{"key": f"proficiency:{p}", "id": p, "current": p}
                for p in sorted(profs)]
(CHUNKS / "5_stations_profs.json").write_text(
    json.dumps({"stations": station_list, "proficiencies": prof_list}, ensure_ascii=False, indent=2),
    encoding="utf-8",
)
print(f"5_stations_profs: {len(station_list)} stations, {len(prof_list)} proficiencies")
