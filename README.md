# SoulmaskDB

Extracts item drop tables from the Soulmask game using the UE4 developer modkit,
producing a structured JSON database with English item names.

## Output

`Game/Parsed/drops.json` — 1292 drop entries, 1250 unique items with English names.

Each entry covers one drop source (NPC tier, creature, plant, tribe, ruins, DLC dungeon, etc.)
and lists the items it can drop with quantities, weights, and quality levels.

```json
{
  "row_key": "YeZhu",
  "bag_name": "DL_YeZhu",
  "source_type": "creature_body",
  "groups": [
    {
      "probability": 100,
      "items": [
        { "item": "Beast Hide", "item_ref": "...", "qty_min": 1, "qty_max": 2, "weight": 30, "quality": 1 },
        { "item": "Fresh Meat", "item_ref": "...", "qty_min": 2, "qty_max": 3, "weight": 70, "quality": 1 }
      ]
    },
    { "probability": 10, "items": [{ "item": "Beast Bone", ... }] }
  ]
}
```

## Drop sources

| source_type          | Table                       | Entries |
|----------------------|-----------------------------|---------|
| `npc`                | DT_NPCDrop                  | 280     |
| `creature_body`      | DT_ShengWuCaiJiBao          | 252     |
| `npc_dlc`            | DT_NpcDrop_AdditionMap01    | 184     |
| `ruins`              | DT_YiJi                     | 116     |
| `plant`              | DT_ZhiBeiCaiJiBao           | 100     |
| `tribe`              | DT_BuLuoDiaoLuoBao          | 70      |
| `item_bag`           | DT_ZhiZuo                   | 43      |
| `relic_dlc`          | DT_Relic                    | 161     |
| `tribe_dlc`          | DT_Tribe                    | 53      |
| `dungeon_dlc`        | DT_Dungeon                  | 14      |
| `underground_city`   | DT_DiXiaCheng               | 19      |

## Requirements

- Soulmask modkit installed at `C:\Program Files\Epic Games\SoulMaskModkit`
  (UE4.27.2, includes Python 3.7 and all DataTable assets)
- Python 3.x for running `parse_exports.py` and `parse_localization.py`

## Pipeline

```
[Modkit .uasset files]
        │
        ▼
export_tables.py        (runs inside UE4Editor-Cmd via -ExecutePythonScript)
  • reads column names from .uasset binary FName table
  • calls DataTableFunctionLibrary.get_data_table_column_as_string() per column
  • writes Game/Exports/<TableName>.json
        │
        ▼
parse_exports.py        (runs with any Python 3.x)
  • parses UE4 export-text format in DaoJuBaoContent column
  • resolves item Blueprint paths → English names via parse_localization.py
  • writes Game/Parsed/drops.json
```

### Running the export

```bash
# Step 1: export DataTables (takes ~5 min, shaders already cached)
"C:\Program Files\Epic Games\SoulMaskModkit\Engine\Binaries\Win64\UE4Editor-Cmd.exe" \
  "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\WS.uproject" \
  -ExecutePythonScript="<path>\export_tables.py" \
  -stdout -FullStdOutLogOutput -unattended -nopause

# Step 2: parse exports
python parse_exports.py
```

### Localization

`parse_localization.py` reads `Content/Localization/Game/en/Game.po` from the modkit
and builds a `{normalized_asset_path → English_name}` dictionary (5203 entries).
The `.po` file uses GNU gettext format with `#. SourceLocation` comments pointing to
the Blueprint asset that owns each string.

## Data format: DaoJuBaoContent

All 11 DataTables share the same row struct (`CaiJiDaoJuBaoDataTable`) with the same columns:
- `DaoJuBaoName` — identifier for this drop bag (referenced by NPC blueprints)
- `DaoJuBaoContent` — serialized array of drop groups (see below)
- `ExtraDropContentData` — supplemental drops (usually empty)
- `AssginMeshData` — mesh assignment, not relevant for drops

`DaoJuBaoContent` is UE4 property-export text:

```
((SelectedRandomProbability=30, ConditionAndCheckData=,
  BaoNeiDaoJuInfos=(
    (DaoJuQuanZhong=10,                                        ← weight
     DaoJuMagnitude=(LowerBound=(Type=Inclusive,Value=1),
                     UpperBound=(Type=Inclusive,Value=3)),      ← qty range
     DaoJuPinZhi=EDJPZ_Level1,                                 ← quality 1-6
     DaoJuClass=BlueprintGeneratedClass'"/Game/..."',           ← item class
     ShuLiangBuShouXiShuYingXiang=False),
    ...
  )
), ...)
```

## Technical notes

### UE4 Python API limitations (UE4.27.2)

The following were tried and **do not work** in this version:

| Attempt | Result |
|---------|--------|
| `unreal.FieldIterator(struct)` | `AttributeError` — not in UE4.27 |
| `EditorAssetLibrary.export_asset()` | method doesn't exist |
| `table.call_method('GetTableAsJSON')` | only UFunctions accessible, not C++ methods |
| `dir()` / `vars()` on struct CDO | no UPROPERTY fields exposed |
| `AssetExportTask` with .csv/.json | returned False silently |

**What works:** Read the `.uasset` binary directly to extract FName strings (property names
live in the package name table), then probe each name with
`DataTableFunctionLibrary.get_data_table_column_as_string(table, name)`.
