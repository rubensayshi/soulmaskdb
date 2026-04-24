"""
Download creature spawn locations from saraserenity.net and strip to minimal JSON.

Input:  https://saraserenity.net/soulmask/map/data.php?map=Level01_Main  (52MB)
Output: Game/Parsed/spawn_locations.json  (~200-500KB)

Only keeps creature/animal spawn groups. Drops loot tables, icons, UE4 world
coords, respawn timers, proximity ranges.
"""
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "Game" / "Parsed" / "spawn_locations.json"

DATA_URL = "https://saraserenity.net/soulmask/map/data.php?map=Level01_Main"

SPAWN_GROUPS = {"Animal Spawn"}


def main():
    print(f"Fetching {DATA_URL} ...")
    req = urllib.request.Request(DATA_URL, headers={"User-Agent": "SoulmaskCodex/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        raw = json.loads(resp.read())
    print(f"  Got {len(raw)} categories")

    spawns = []
    for category in raw:
        gp = category.get("gpName", "")
        if gp not in SPAWN_GROUPS:
            continue
        creature_type = category.get("type", "")
        if not creature_type:
            continue
        for item in category.get("items", []):
            pos = item.get("pos", {})
            data = item.get("data", {})
            lat = pos.get("lat")
            lon = pos.get("lon")
            if lat is None or lon is None:
                continue
            desc = data.get("desc", "")
            level = ""
            if desc.startswith("Level "):
                level = desc.replace("Level ", "")
            spawns.append({
                "creature": creature_type,
                "group": gp,
                "level": level,
                "lat": lat,
                "lon": lon,
            })

    OUT.write_text(json.dumps(spawns, indent=2), encoding="utf-8")

    creatures = sorted(set(s["creature"] for s in spawns))
    groups = sorted(set(s["group"] for s in spawns))
    print(f"  Wrote {len(spawns)} spawn points for {len(creatures)} creature types")
    print(f"  Groups: {', '.join(groups)}")
    print(f"  Sample creatures: {', '.join(creatures[:20])}")
    if len(creatures) > 20:
        print(f"  ... and {len(creatures) - 20} more")
    print(f"  Output: {OUT}")


if __name__ == "__main__":
    main()
