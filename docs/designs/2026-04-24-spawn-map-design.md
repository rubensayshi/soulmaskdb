# Spawn Map on Item Pages

Show creature spawn locations on a small map for items obtainable from skinning/butchering creatures.

## Data Source

Saraserenity.net `data.php?map=Level01_Main` — 52MB JSON with spawn coordinates for all creature types on the Cloud Mist Forest map. Each spawn entry has UE4 world coords (`posX`/`posY`/`posZ`), map projection coords (`lat`/`lon`), level range, spawn count, and loot tables.

We also have 6,832 raw spawn points extracted from `.umap` files (`origin/docs/spawn-extraction` branch, `Game/Parsed/spawns.json`), but these lack creature type resolution (spawner class is generic `HShuaGuaiQiBase`). Useful for future validation but not directly usable yet.

## Pipeline

### New script: `pipeline/download_spawns.py`

Fetches saraserenity data and strips it to:

```json
[
  {
    "creature": "Giant Alligator",
    "group": "Animal Spawn",
    "level": "11-20",
    "lat": -2279,
    "lon": 3184
  }
]
```

Drops: loot tables, descriptions, icons, UE4 world coords (lat/lon is sufficient for map rendering), respawn timers, proximity ranges.

Output: `Game/Parsed/spawn_locations.json` (~200-500KB estimated).

Only fetches `Level01_Main` (Cloud Mist Forest) for now. DLC map can be added later.

### Name mapping

Saraserenity creature names need to map to our DB `drop_sources.source_name` values. The mapping is non-trivial because:

| Our DB name | Saraserenity name |
| --- | --- |
| Alligator | Giant Alligator |
| Alligator (Elite) | Elite Alligator |
| Alligator (Ruins) | Alligator (Ruins) |
| Alligator (Bonus) | (same spawn as Alligator — bonus is a loot table variant, not a location) |
| Alligator (Hunt) | (same spawn as Alligator — hunt event variant) |
| Alligator (Hunt Elite) | (same spawn as Elite — hunt event variant) |

Rules for normalizing our DB names to map creature types:
1. Strip `(Bonus)` suffix — same spawn location as base creature
2. Strip `(Hunt)` suffix — event variant at same location
3. Strip `(Hunt Elite)` suffix — maps to the Elite variant's spawns
4. Keep `(Elite)` — distinct spawn locations
5. Keep `(Ruins)` — distinct spawn locations

The mapping table (saraserenity name → our normalized DB name) will be hand-maintained in `build_db.py` since the naming conventions differ (e.g. "Giant Alligator" vs "Alligator", "Brown Bear" vs "Black Bear"). There are ~50 creature types to map.

### DB changes: `build_db.py`

New table in schema:

```sql
CREATE TABLE creature_spawns (
  creature_type TEXT NOT NULL,  -- normalized name matching drop_sources
  lat INTEGER NOT NULL,
  lon INTEGER NOT NULL,
  level_desc TEXT,              -- e.g. "11-20"
  PRIMARY KEY (creature_type, lat, lon)
);
```

`build_db.py` loads `spawn_locations.json`, applies the name mapping, and inserts rows.

### SQL query

New query `GetSpawnLocationsForItem`:

```sql
SELECT cs.creature_type, cs.lat, cs.lon, cs.level_desc
FROM creature_spawns cs
WHERE cs.creature_type IN (
  SELECT DISTINCT
    CASE
      WHEN ds.source_name LIKE '% (Bonus)' THEN REPLACE(ds.source_name, ' (Bonus)', '')
      WHEN ds.source_name LIKE '% (Hunt Elite)' THEN REPLACE(ds.source_name, ' (Hunt Elite)', ' (Elite)')
      WHEN ds.source_name LIKE '% (Hunt)' THEN REPLACE(ds.source_name, ' (Hunt)', '')
      ELSE ds.source_name
    END
  FROM drop_source_items dsi
  JOIN drop_sources ds ON ds.id = dsi.source_id
  WHERE dsi.item_id = ? AND ds.source_type = 'creature_body'
)
ORDER BY cs.creature_type, cs.lat, cs.lon
```

## Backend

### `handleItem` changes

Add `spawn_locations` to `ItemDetail` response. Grouped by creature type:

```json
{
  "spawn_locations": [
    {
      "creature": "Giant Alligator",
      "level": "11-20",
      "spawns": [
        { "lat": -2279, "lon": 3184 },
        { "lat": -2352, "lon": 3389 }
      ]
    },
    {
      "creature": "Elite Alligator",
      "level": "20-30",
      "spawns": [
        { "lat": -1500, "lon": 2800 }
      ]
    }
  ]
}
```

The grouping happens in Go — query returns flat rows, handler groups by `creature_type`.

## Frontend

### Types

Add to `ItemDetail`:

```typescript
interface SpawnGroup {
  creature: string
  level: string
  spawns: { lat: number; lon: number }[]
}

interface ItemDetail {
  // ... existing fields
  spawn_locations?: SpawnGroup[]
}
```

### Map component: `SpawnMap.tsx`

- **Leaflet** with `CRS.Simple` — image overlay, no tile server
- **Disabled interactions**: no zoom, no pan, no scroll, no keyboard, no touch zoom
- **Background**: static world map image (`/map-cloud-mist.jpg`)
- **Markers**: colored circle markers per creature group
- **Legend**: small row below the map — creature name + colored dot + level range
- **Size**: ~300px tall, full content width, responsive
- **Bounds**: calibrated using saraserenity's lat/lon range mapped to image dimensions

Leaflet is used purely as a rendering engine — the result looks like a static image with dots on it.

### Map image: `web/public/map-cloud-mist.jpg`

Stitched from saraserenity's map tiles at a zoom level that gives ~2048px wide image. JPEG for size efficiency. Fallback: if we can extract `Level01_Map.uasset` via FModel, use that instead (better quality, no tile artifacts).

### Item page integration

Rendered after the "Obtained From" section, only when `spawn_locations` is non-empty:

```tsx
{detail?.spawn_locations && detail.spawn_locations.length > 0 && (
  <>
    <SectionHeader title="Spawn Locations" sub="World Map" accent="rust" />
    <SpawnMap groups={detail.spawn_locations} />
  </>
)}
```

## Dependencies

- `leaflet` npm package (~40KB gzipped)
- No other new dependencies

## Out of scope

- DLC map (Shifting Sands) — add later via `data.php?map=DLC_Level01_Main`
- Wiring up our own `.umap` extraction to replace saraserenity data
- Deeplink to saraserenity from our map
- Clickable markers with popups/tooltips
- Zoom/pan interaction
