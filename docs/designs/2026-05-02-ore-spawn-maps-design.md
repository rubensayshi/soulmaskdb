# Ore/mineral spawn maps on item detail pages

Show ore vein and deposit locations on the existing item detail map for items obtained by mining.

## Data model

New table in `schema.sql`:

```sql
CREATE TABLE ore_spawns (
    item_id      TEXT    NOT NULL,
    ore_type     TEXT    NOT NULL,
    ore_category TEXT    NOT NULL,  -- 'vein' or 'deposit'
    lat          INTEGER NOT NULL,
    lon          INTEGER NOT NULL,
    map          TEXT    NOT NULL DEFAULT 'base',
    PRIMARY KEY (item_id, ore_category, lat, lon, map)
);
```

- `item_id` references `items.id` (e.g. `Daoju_Item_TieKuangShi`)
- `ore_category` distinguishes mineral veins (`BP_JianZhu_KuangMai_*`) from ore deposits (`BP_Collections_*_Medium_C`)
- `lat`/`lon` are map-pixel coordinates (same coordinate space as `creature_spawns`)

## Pipeline (`build_db.py`)

### Coordinate transform

Applied at insert time, same formula as creature spawns:

```
lon = round(pos_x * 0.0050178419 + 2048.206056)
lat = round(pos_y * -0.0050222678 + -2048.404771)
```

### Ore type → item ID mapping

Manual dict in `build_db.py`. Small and stable — game doesn't add ore types often.

```python
ORE_TYPE_TO_ITEM = {
    # Veins (from ore_spawns.json)
    "Iron Ore":      "Daoju_Item_IronOre",
    "Copper Ore":    "Daoju_Item_CopperOre",
    "Coal":          "Daoju_Item_CoalOre",
    "Tin Ore":       "Daoju_Item_TinOre",
    # Deposits (from ore_deposits.json)
    "Clay":          "Daoju_Item_Clay",
    "Obsidian":      "Daoju_Item_HugeStone",     # 黑曜石 (BlackStone class)
    "Crystal":       "Daoju_Item_Crystal",
    "Ice":           "Daoju_Item_Ice",
    "Sulfur Ore":    "Daoju_Item_SulfurOre",
    "Phosphate Ore": "Daoju_Item_PhosphateOre",
    "Nitrate Ore":   "Daoju_Item_Nitre",
    "Salt Mine":     "Daoju_Item_SaltOre",
    "Meteorite Ore": "Daoju_Item_Meteorites",
    "Crude Salt":    "Daoju_Item_CuYan",
    "Sea Salt":      "Daoju_Item_CuYan",          # same item as crude salt
    "Coal Ore":      "Daoju_Item_CoalOre",         # same item as vein Coal
}
```

All item IDs verified against `Game/Parsed/items.json`.

### Ingestion

Reads two files:
1. `Game/Parsed/ore_spawns.json` — veins (147 nodes), category `"vein"`
2. `Game/Parsed/ore_deposits.json` — deposits (824 nodes), category `"deposit"`

For each entry: look up `item_id` from `ORE_TYPE_TO_ITEM`, apply coordinate transform, insert into `ore_spawns`. Skip entries with unknown ore types (log warning).

### Map field

Veins: all from `Level01_GamePlay` → `map = "base"`.
Deposits: map names like `Level01_G1_Near` → `"base"`, `DLC_Level01_B7_Near` → `"dlc"`. Derive from prefix.

## Backend

### SQL query

```sql
-- name: GetOreSpawnsForItem :many
SELECT ore_type, ore_category, lat, lon, map
FROM ore_spawns
WHERE item_id = ?
ORDER BY map, ore_category, ore_type, lat, lon;
```

### API handler

In `items.go`, after fetching creature spawns:

1. Call `GetOreSpawnsForItem(item_id)`
2. Group results by `map`, then by `(ore_type, ore_category)` — each unique combination becomes a `SpawnGroup`
3. Group label: `"Iron Vein"` / `"Iron Deposit"` (ore_type with category suffix, omit "Ore" from deposit labels to keep legend compact)
4. Append groups to the existing `SpawnMap` entries (same `spawn_locations` response field)

No new API endpoint. No new response types.

## Frontend

Zero changes. The existing `SpawnMap` component handles:
- Multiple groups with different colors + legend (already supports 8 colors)
- Base/DLC map tabs (already in item page)
- Auto-zoom to fit all markers

Items never have both creature spawns and ore spawns, so no mixing concern.

## Data coverage

| Source         | Nodes | Status                          |
| -------------- | ----- | ------------------------------- |
| Mineral veins  | 147   | Complete (matches saraserenity) |
| Ore deposits   | 824   | Partial (~400/1,226 base game) |

Missing deposits can be backfilled by re-running the Windows extraction on more sublevel maps. No code changes needed — `build_db.py` reads whatever is in `ore_deposits.json`.

## Data quality findings

Issues discovered during implementation that affect extraction accuracy and completeness.

### Actor name filtering

Not every entry in `ore_deposits.json` is a real deposit. The `actor_name` field distinguishes real geometry from sublevel metadata:

| `actor_name` pattern   | What it is                          | Action              |
| ---------------------- | ----------------------------------- | ------------------- |
| `DefaultSceneRoot`     | Real deposit                        | Keep                |
| `StaticMeshComponent0` | Real deposit                        | Keep                |
| `BrushComponent0`      | Real deposit (if coords are valid)  | Keep, bounds-check  |
| `BoxComponent0`        | Sublevel bounding-box marker        | **Always discard**  |

All `BoxComponent0` entries have round sentinel coordinates (e.g. `-350000, 150000`) and never represent mineable deposits. `build_db.py` already filters these at ingestion time.

### Sentinel coordinates

Many DLC sublevel entries (all `BrushComponent0` actors) carry sentinel coordinates `(-408000, -408000)`, which transform to map pixel `(1, 1)`. These fall outside the valid map bounds and are removed by the existing bounds check in `build_db.py`. No code change needed, but the extraction itself should ideally not emit them.

### Copper deposits are missing

All 10 `Copper Ore` entries in `ore_deposits.json` were bogus: 7 were `BoxComponent0` bounding-box markers and 3 were `BrushComponent0` entries with sentinel coordinates. After filtering, copper has 0 deposits (though 34 veins exist from `ore_spawns.json`).

The extraction script needs to be re-run to capture actual `BP_Collections_Copper_Medium_C` actors from the relevant sublevels.

### Deposit counts after filtering

Several ore types have suspiciously low counts, suggesting incomplete sublevel coverage during extraction. Compare against in-game experience to decide which need re-extraction.

| Ore type       | Deposits (base) | Deposits (DLC) | Total deposits | Veins | Notes                             |
| -------------- | --------------- | -------------- | -------------- | ----- | --------------------------------- |
| Obsidian       | 96              | 176            | 272            | --    |                                   |
| Clay           | --              | --             | 145            | --    |                                   |
| Iron Ore       | --              | --             | 115            | 56    |                                   |
| Crystal        | --              | --             | 55             | --    |                                   |
| Coal Ore       | --              | --             | 43             | 25    | Veins listed as "Coal"            |
| Ice            | --              | --             | 32             | --    |                                   |
| Tin Ore        | --              | --             | 31             | 29    |                                   |
| Meteorite Ore  | --              | --             | 30             | --    |                                   |
| Nitrate Ore    | --              | --             | 14             | --    |                                   |
| Copper Ore     | 0               | 0              | 0              | 34    | **Completely missing, see above** |
| Sulfur Ore     | --              | --             | 5              | --    | Likely incomplete                 |
| Sea Salt       | --              | --             | 4              | --    | Likely incomplete                 |
| Phosphate Ore  | --              | --             | 3              | --    | Likely incomplete                 |
| Salt Mine      | --              | --             | 2              | --    | Likely incomplete                 |

### Updated coverage

The original data coverage table listed 824 raw deposit entries. After filtering `BoxComponent0` markers and sentinel coordinates, approximately 670 valid deposit entries remain. The veins (147) are unaffected.

## Scope exclusions

- No dedicated `/resource-map` page (future, if needed)
- No filtering/toggling layers on the map (existing SpawnMap doesn't support it)
- No new map tile layers or icons — uses same circle markers as creature spawns
