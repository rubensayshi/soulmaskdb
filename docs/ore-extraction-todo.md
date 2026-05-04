# Ore deposit extraction: sublevel coverage gap

## Status

**Veins (`BP_JianZhu_KuangMai_*`): DONE.** 147 total across 4 types, matches SaraSerenity exactly. Do not re-extract.

**Deposits (`BP_Collections_*`): ~10-20% coverage.** We have 253, need ~2,064 (1,226 base + 838 DLC).

## Coverage gap: base map deposits

| Type          | SaraSerenity | Ours | Coverage |
| ------------- | ------------ | ---- | -------- |
| Clay          | 328          | 55   | 17%      |
| Obsidian      | 301          | 67   | 22%      |
| Iron Ore      | 200          | 4    | 2%       |
| Copper Ore    | 105          | 6    | 6%       |
| Tin Ore       | 75           | 10   | 13%      |
| Ice           | 49           | 5    | 10%      |
| Coal Ore      | 33           | 7    | 21%      |
| Sulfur Ore    | 30           | 4    | 13%      |
| Crystal       | 28           | 3    | 11%      |
| Phosphate Ore | 21           | 4    | 19%      |
| Nitrate Ore   | 21           | 4    | 19%      |
| Salt Mine     | 16           | 4    | 25%      |
| Meteorite Ore | 14           | 3    | 21%      |
| Crude Salt    | 5            | 0    | 0%       |
| **Total**     | **1,226**    | **176** |        |

DLC deposits: we have 44 total vs SaraSerenity's 838.

## Root cause

The script scans `*_Near.umap` sublevel tiles but only 11 of ~64 base grid cells produce results. Either:

1. Most ore deposits live in **additional sublevel file types** we're not scanning (e.g. `_CaiJi`, `_Res`, `_Collect`, or other streaming layer patterns)
2. Some tiles use a **different sublevel suffix** or directory structure

Current grid cell coverage (base map, `Level01_<cell>_Near`):

```
     1  2  3  4  5  6  7  8
  A: .  .  .  .  .  .  .  .
  B: .  X  X  .  X  .  .  .
  C: .  .  .  .  .  .  .  .
  D: .  .  .  .  .  .  .  .
  E: .  .  .  .  .  .  X  .
  F: .  X  .  .  X  .  .  .
  G: X  X  .  .  .  .  .  .
  H: X  X  .  X  .  .  .  .
```

## Instructions for re-extraction

### Step 1: enumerate ALL sublevel .umap files

Before running the extraction, list every `.umap` file under the base and DLC map directories to find patterns we're missing:

```powershell
$BaseRoot = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\Maps\Level01"
$DLCRoot  = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\AdditionMap01\Maps\DLC_Level01"

# List all subdirectories under Level01_Hub
Get-ChildItem "$BaseRoot\Level01_Hub" -Directory | ForEach-Object { Write-Host $_.Name }

# List all .umap files grouped by suffix pattern
Get-ChildItem "$BaseRoot\Level01_Hub" -Recurse -Filter "*.umap" |
    ForEach-Object { if ($_.Name -match '_([A-Za-z]+)\.umap$') { $Matches[1] } else { $_.BaseName } } |
    Group-Object | Sort-Object Count -Descending |
    ForEach-Object { Write-Host ("{0,5} {1}" -f $_.Count, $_.Name) }

# Same for DLC
Get-ChildItem "$DLCRoot\DLC_Level01_Hub" -Recurse -Filter "*.umap" |
    ForEach-Object { if ($_.Name -match '_([A-Za-z]+)\.umap$') { $Matches[1] } else { $_.BaseName } } |
    Group-Object | Sort-Object Count -Descending |
    ForEach-Object { Write-Host ("{0,5} {1}" -f $_.Count, $_.Name) }
```

Look for sublevel suffixes besides `_Near`. Candidates: `_CaiJi`, `_Res`, `_Collect`, `_Resource`, `_Far`, `_Detail`, `_Foliage`, etc.

### Step 2: scan a sample tile that has zero deposits

Pick a grid cell with zero current deposits (e.g. `Level01_A1_Near` or `Level01_C3_Near`). Export it and check if it has `BP_Collections_*` actors. If not, check ALL other `.umap` files for that same grid cell:

```powershell
# List all .umap files for a specific grid cell
Get-ChildItem "$BaseRoot\Level01_Hub" -Filter "Level01_C3_*" | ForEach-Object { Write-Host $_.Name }
```

Then export each one and check for BP_Collections_* actors.

### Step 3: update `parse_ore_deposits_run.ps1`

Once you identify the missing sublevel types, add them to the `Add-Dir` calls in the script. Currently it only scans:

```
Level01_Hub/*_Near.umap
DLC_Level01_Hub/*_Near.umap
Level01_KuangDong/*.umap
Level_BuLuo/*.umap
Level01_YiJi/*.umap
Level_NieLian/*.umap
Seabed sublevels
DLC Ruins/FloatingIslands/ShipCamp/Egypt
```

If the missing deposits are in e.g. `*_CaiJi.umap` files, add:
```powershell
Add-Dir "$BaseRoot\Level01_Hub"    "*_CaiJi.umap"
Add-Dir "$DLCRoot\DLC_Level01_Hub" "*_CaiJi.umap"
```

Or if ALL `.umap` files in Hub should be scanned:
```powershell
Add-Dir "$BaseRoot\Level01_Hub"    "*.umap"
Add-Dir "$DLCRoot\DLC_Level01_Hub" "*.umap"
```

### Step 4: run the updated script

```powershell
cd C:\path\to\repo
powershell -ExecutionPolicy Bypass -File pipeline\parse_ore_deposits_run.ps1
```

### Step 5: validate

Compare output counts against these targets:

| Type          | Base target | DLC target | Combined |
| ------------- | ----------- | ---------- | -------- |
| Clay          | 328         | ?          | ?        |
| Obsidian      | 301         | ?          | ?        |
| Iron Ore      | 200         | ?          | ?        |
| Copper Ore    | 105         | ?          | ?        |
| Tin Ore       | 75          | ?          | ?        |
| Ice           | 49          | ?          | ?        |
| Coal Ore      | 33          | ?          | ?        |
| Sulfur Ore    | 30          | ?          | ?        |
| Crystal       | 28          | ?          | ?        |
| Phosphate Ore | 21          | ?          | ?        |
| Nitrate Ore   | 21          | ?          | ?        |
| Salt Mine     | 16          | ?          | ?        |
| Meteorite Ore | 14          | ?          | ?        |
| Crude Salt    | 5           | ?          | ?        |
| **Total**     | **1,226**   | **838**    | **2,064** |

DLC breakdown not available from SaraSerenity (they show 838 total DLC deposits but don't break by type).

If counts are still low after adding sublevel types, consider:
- BP_Collections actors might use a **different class name** in some sublevels
- Some deposits might be in the `Level01_GamePlay*.umap` files (already covered by ore_spawns for veins, but not checked for BP_Collections deposits)
- The bounds check filter might be too aggressive (check the `-408000` sentinel filter and lat/lon ranges)

### Step 6: commit

```
feat: expand ore deposit extraction to all sublevel types

Previously only scanned *_Near.umap tiles (253 deposits).
Now covers all sublevel types for full map coverage (~2,064 target).
```

Commit updated `pipeline/parse_ore_deposits_run.ps1` and `Game/Parsed/ore_deposits.json`.

## Remaining gap: cave deposits in SE copper area

After the foliage HISMC expansion (10k+ deposits), cross-referencing against SaraSerenity shows one remaining gap. In the south-central area around map coordinates `lat -3030, lon 1700-1750` there are 3 copper veins and only 1 deposit visible. SaraSerenity shows a cluster of additional copper deposits in this area which appear to be inside a cave/mine (KuangDong sublevel).

The extraction script already scans `Level01_KuangDong/*.umap` but these specific cave deposits may be in a sublevel that was missed, or may use a different actor class inside the cave geometry.

### To investigate

1. Check which `Level01_KuangDong` sublevels contain `BP_Collections_Copper_Medium_C` actors
2. Verify the extraction script is scanning all `.umap` files in that directory (not just `*_Near.umap`)
3. The cave deposits may also appear in `Level_NieLian` (smelting area) sublevels

This appears to be the only remaining coverage gap — all other ore types now have good coverage compared to SaraSerenity.
