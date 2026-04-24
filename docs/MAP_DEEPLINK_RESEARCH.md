# Map Deeplink Research

Summary of reverse engineering two third-party Soulmask interactive maps. Goal: link users from our site to a map view with specific filters pre-selected (e.g. "show Giant Alligator spawns").

## Sites investigated

### 1. saraserenity.net (richer data, primary target)

- **URL**: `https://saraserenity.net/soulmask/map/`
- **Author**: `@saraserenity` on official Soulmask Discord
- **Tech**: React SPA with Leaflet, server-rendered data via PHP

**URL parameters observed:**
- `?level=Level01_Main` — Cloud Mist Forest (default)
- `?level=DLC_Level01_Main` — Shifting Sands (DLC map)
- No other URL params observed for filtering. The sidebar checkboxes appear to be client-side state only (no URL hash or query params update when toggling filters).

**Data endpoint:**
- `GET /soulmask/map/data.php?map=Level01_Main` — returns full 52MB JSON array
- `GET /soulmask/map/data.php?map=DLC_Level01_Main` — DLC map equivalent

**Data structure:**
```json
[
  {
    "gpIdx": 4,
    "gpName": "Animal Spawn",    // sidebar section
    "type": "Giant Alligator",   // checkbox label
    "icon": "icon_name",
    "items": [
      {
        "modes": null,           // game mode filter (null = all modes)
        "key": null,
        "pos": { "lat": -2279, "lon": 3184 },  // map projection coords (integers)
        "data": {
          "title": "Giant Alligator",
          "name": "Animal",
          "desc": "Level 11 - 20",
          "posX": 226432, "posY": 45839, "posZ": 37233,  // UE4 world coords
          "num": 1, "max": 1,       // spawn count / cap
          "intr": 600,              // respawn interval (seconds)
          "ply": 2000, "bld": 5000, // player/building proximity
          "collectmap": [...]       // full loot tables
        }
      }
    ]
  }
]
```

**167 categories** across groups: Point of Interest, Baby Animal Spawn, Animal Spawn, Human Spawn, Event Spawn, Other Spawn, Lootable Objects, Collectible Objects, Ore Deposits, Mineral Veins.

**Sidebar controls:**
- Game Mode dropdown: Survival, Tribe, Warrior, PVP, Casual
- Per-section "All" / "Default" / "None" buttons
- Individual checkboxes per type
- Some types are checked by default (POIs mostly), spawns are unchecked by default

**Deeplink feasibility:** Unknown — need to inspect the JS source to see if the app reads URL hash/query params to set initial filter state, or if we could propose a PR to add that feature. The React app likely uses `useState` or a store for checkbox state; wiring it to URL params would be straightforward.

### 2. gamingwithdaopa.ellatha.com (simpler, GeoJSON)

- **URL**: `https://gamingwithdaopa.ellatha.com/soulmask/map/`
- **Tech**: WordPress + Leaflet plugin (`leaflet-react-map`), static JSON files

**Data endpoints:** Individual GeoJSON files per category:
```
/media/soulmask/alligator.json
/media/soulmask/anaconda.json
/media/soulmask/bearz.json
/media/soulmask/pyramid.json
... (~50 files)
```

**Data structure (standard GeoJSON):**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [32.30, -39.40] },
      "properties": {
        "id": 1,
        "name": "Alligator 1",
        "description": "Butchering may drop: Sharp Fang, Alligator Skin...",
        "iconUrl": "https://gamingwithdaopa.ellatha.com/media/icons/alligator.png",
        "iconSize": [20, 20]
      }
    }
  ]
}
```

**Comparison:**

| | saraserenity | ellatha/DaOpa |
| --- | --- | --- |
| Alligator spawns | 173 | 73 |
| Coord system | UE4 world + map lat/lon | Leaflet lat/lon only |
| Metadata | Level range, respawn timer, loot | Item names only |
| Total data | 52MB, 167 categories | ~50 separate JSON files |
| URL params for filters | Not observed | Not observed |

**Deeplink feasibility:** WordPress Leaflet plugin — less likely to support custom URL params. Could link to the page but probably can't pre-select layers.

## Investigation tasks for next agent

1. **Inspect saraserenity JS source** — look at the React app bundle for:
   - Does it read URL hash or query params on load?
   - How is sidebar filter state managed? (React state, Redux, Zustand, URL?)
   - Is there already a sharing/permalink feature hidden somewhere?
   - The JS is likely in a bundled chunk under `/soulmask/map/static/js/` or similar

2. **Test URL variations** on saraserenity:
   - Try `?type=Giant+Alligator` or `#Giant+Alligator`
   - Try `?filter=Animal+Spawn` or `?show=Giant+Alligator`
   - Try `?gpName=Animal+Spawn&type=Giant+Alligator`
   - Check if the URL updates when toggling checkboxes (it didn't appear to during testing, but worth confirming)

3. **If no deeplink support exists**, evaluate options:
   - Could we embed the map in an iframe and control it via postMessage?
   - Could we link to the page and use a URL fragment that a bookmarklet/userscript interprets?
   - Should we just link to the map homepage and let users filter manually?
   - Should we build our own map page using the spawn data we can extract? (see `docs/SPAWN_EXTRACTION.md`)

4. **Check ellatha map** for similar URL param support — lower priority since their data is sparser.
