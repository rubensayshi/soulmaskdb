# Item Detail Enrichment Design

**Date:** 2026-04-23
**Goal:** Enrich the existing item detail page with descriptions, stats, drop sources, and tech tree unlock info.

## Scope

Four new data sections on the item detail page, plus a Pinyin-to-English translation map for stat attributes and creature names.

### 1. Item Description

Show `description_zh` in the ItemHeader below the classification line. Already in the DB, just not sent to the frontend graph or displayed.

### 2. Item Stats (weapons/armor/equipment)

306 items have stat arrays with ~40 distinct Pinyin attribute names (`WuQiDamageInc`, `MaxFuZhong`, etc). Display as a compact stat table on the item page, with English labels from a hand-maintained translation map.

**Stat attribute translation map** (new file `data/translations/stat_attrs.json`):

| Pinyin                        | English                  |
| ----------------------------- | ------------------------ |
| Attack                        | Attack                   |
| Defense                       | Defense                  |
| Crit                          | Critical Chance          |
| CritDamageInc                 | Critical Damage          |
| CritDef                       | Critical Defense         |
| MaxHealth                     | Max Health               |
| HealthRecover                 | Health Regen             |
| MaxTiLi                       | Max Stamina              |
| TiLiRecover                   | Stamina Regen            |
| TiLiWakenJianMian             | Stamina Reduction        |
| MaxFood                       | Max Food                 |
| MaxWater                      | Max Water                |
| MaxFuZhong                    | Max Carry Weight         |
| SpeedRate                     | Movement Speed           |
| WuQiDamage                    | Weapon Damage            |
| WuQiDamageInc                 | Weapon Damage Bonus      |
| WuQiDamageDec                 | Weapon Damage Reduction  |
| WuQiDamageIncAgainstDun       | Damage vs Shields        |
| WuQiDunDamageDec              | Shield Damage Reduction  |
| WuQiEventMagnitude            | Weapon Effect Power      |
| DamageDec                     | Damage Reduction         |
| BlockWeakenTenacityDefense    | Block Tenacity Defense   |
| BaTi                          | Poise                    |
| ShengYinRatio                 | Noise Level              |
| WenDuBaoNuan                  | Cold Insulation          |
| WenDuSanRe                    | Heat Insulation          |
| WenDuAdd                      | Temperature Bonus        |
| YinBiValue                    | Stealth                  |
| HanKang                       | Cold Resistance          |
| YanKang                       | Heat Resistance          |
| FuKang                        | Corrosion Resistance     |
| DuKang                        | Poison Resistance        |
| ZhuangBeiFangDu               | Equipment Poison Def     |
| ZhuangBeiFangFuShe            | Equipment Radiation Def  |
| BleedingDamageCarried         | Bleed Damage             |
| ParalysisDamageCarried        | Paralysis Damage         |
| FallSleepDamageCarried        | Sleep Damage             |
| FallDamageDec                 | Fall Damage Reduction    |
| HeadMaxHP                     | Head Max HP              |
| BodyMaxHP                     | Body Max HP              |
| LeftArmMaxHP                  | Left Arm Max HP          |
| LeftLegMaxHP                  | Left Leg Max HP          |

### 3. Drop Sources ("Obtained From")

1,292 drop tables with source types: `creature_body` (252), `npc` (280), `plant` (100), `tribe` (70), etc. 91% of item refs link to items.json IDs.

**New DB tables:**

```sql
CREATE TABLE drop_sources (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  bag_name    TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_name TEXT
);

CREATE TABLE drop_source_items (
  source_id   INTEGER NOT NULL REFERENCES drop_sources(id),
  item_id     TEXT NOT NULL,
  probability INTEGER NOT NULL,
  qty_min     INTEGER NOT NULL DEFAULT 1,
  qty_max     INTEGER NOT NULL DEFAULT 1,
  weight      INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_dsi_item ON drop_source_items(item_id);
```

**Creature name translation map** (new file `data/translations/creature_names.json`):

Translate bag name stems like `Eyu` -> "Alligator", `DaXiang` -> "Elephant", etc. Applied during DB build so `drop_sources.source_name` has English names.

**Display:** On the item page, a "Obtained From" section listing sources grouped by type (Creatures, NPCs, Plants, Chests). Each entry shows: source name, probability, qty range.

For raw/standalone items this replaces the current static "Source: Gathered / Dropped" label with actual data.

### 4. Tech Tree Unlock

Already partially available — `handleItem` returns `tech_unlocked_by` as a list of tech node IDs. The frontend just doesn't display it.

**Display:** Small "Unlocked By" badge or section showing the tech node name(s) and mask level requirement. Shown near the crafting metadata in ItemHeader or as a separate small section.

## Data Flow Changes

### Graph endpoint (`/api/graph`)

Add to each Item in the graph payload:
- `dz`: description_zh (string, nullable) — needed for item page header
- `st`: stats array (nullable) — needed for stat display
- `w`: weight (nullable)
- `dur`: durability (nullable)

These are small per-item and the graph is already cached with ETag.

### Item detail endpoint (`/api/items/{id}`)

Add drop source data — query `drop_source_items` joined with `drop_sources` for the requested item ID. Return as:

```json
{
  "drop_sources": [
    {
      "source_name": "Alligator",
      "source_type": "creature_body",
      "probability": 100,
      "qty_min": 1,
      "qty_max": 3
    }
  ]
}
```

### Pipeline changes

1. `build_db.py`: import drops.json into new tables, apply creature name translations
2. New `data/translations/stat_attrs.json`: Pinyin → English map
3. New `data/translations/creature_names.json`: bag name stem → English creature name

## Frontend Components

### Modified: ItemHeader.tsx

- Add description line below classification
- Add weight/durability stats when available

### New: ItemStats.tsx

Compact table showing translated stat attributes with values. Format percentages (values < 1 like `0.3` → `+30%`), flat values as `+200`. Color-code by category (offense=red, defense=blue, utility=gold).

### New: DroppedBy.tsx

Table/list of drop sources for this item. Grouped by source type. Shows name, probability%, qty range.

### Modified: Item.tsx

- Add new sections after ItemHeader, before Materials Required
- Fetch item detail on mount (for drop sources) — already has graph data for stats
- Show tech unlock info

## Non-changes

- Food Almanac page unchanged (already has its own buff display)
- Awareness XP page unchanged
- Search unchanged
- No new routes — all enrichment on existing item detail page

## Decisions Made

- **Stats on graph, drops on detail endpoint**: Stats are small (array of {attr,value}) and useful for potential future browse/filter. Drops are large (19k refs) and only needed on detail view.
- **Creature names hand-maintained**: Same pattern as STATION_MAP/PROFICIENCY_MAP in parse_recipes.py. ~60 creature stems to translate.
- **Description in graph payload**: Small string, enables showing description in search results or tooltips later.
- **Stat values**: Display as `+30%` for values <1 (multipliers), `+200` for values >=1 (flat). This heuristic matches the game's display convention.
