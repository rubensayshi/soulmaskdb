"""
Download creature spawn locations from saraserenity.net and strip to minimal JSON.

Fetches both the base map (Level01_Main) and DLC map (DLC_Level01_Main).
Only keeps creature/animal spawn groups. Drops loot tables, icons, UE4 world
coords, respawn timers, proximity ranges.
"""
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "Game" / "Parsed" / "spawn_locations.json"

MAPS = {
    "base": "https://saraserenity.net/soulmask/map/data.php?map=Level01_Main",
    "dlc":  "https://saraserenity.net/soulmask/map/data.php?map=DLC_Level01_Main",
}

SPAWN_GROUPS = {"Animal Spawn"}


def fetch_map(map_key, url):
    print(f"Fetching {map_key}: {url} ...")
    req = urllib.request.Request(url, headers={"User-Agent": "SoulmaskCodex/1.0"})
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
                "map": map_key,
            })
    return spawns


def main():
    all_spawns = []
    for map_key, url in MAPS.items():
        spawns = fetch_map(map_key, url)
        all_spawns.extend(spawns)
        creatures = sorted(set(s["creature"] for s in spawns))
        print(f"  {map_key}: {len(spawns)} spawns, {len(creatures)} creature types")

    OUT.write_text(json.dumps(all_spawns, indent=2), encoding="utf-8")

    creatures = sorted(set(s["creature"] for s in all_spawns))
    by_map = {}
    for s in all_spawns:
        by_map.setdefault(s["map"], []).append(s)
    print(f"\nTotal: {len(all_spawns)} spawn points, {len(creatures)} creature types")
    for m, ss in by_map.items():
        print(f"  {m}: {len(ss)} spawns")
    print(f"Output: {OUT}")


if __name__ == "__main__":
    main()
