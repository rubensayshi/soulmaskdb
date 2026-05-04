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

---

# Creature name translations from PO files

## Problem

Creature names in `data/translations/creature_names.json` are manually translated Pinyin→English. Many don't match the official in-game English names from the localization PO files. Compare our names vs SaraSerenity (which uses official names):

| Ours (manual)       | Official (SaraSerenity) |
| ------------------- | ----------------------- |
| Grey Wolf           | Wolf                    |
| Black Bear          | Bear                    |
| Giant Lizard        | Monitor Lizard          |
| Elephant            | Giant Elephant          |
| Mammoth Elephant    | Mammoth                 |
| Poison Frog         | Arrow-poison Frog       |
| Lion                | Wild Lion               |
| Wild Bull           | Bison                   |
| Wild Horse          | Pronghorn               |
| Lobster             | Coconut Crab            |
| Alpha Wolf          | Wasteland Wolf          |
| Deer                | White-Tailed Deer       |
| Large Alpaca        | Llama                   |
| Parrot              | Scarlet Macaw           |
| Pterodactyl         | Horned Eagle            |
| Stag                | Moose                   |
| Rat                 | Mutant Rat              |

Plus creatures we don't have at all: Armadillo, Armadillo Lizard, Bat, Bush Dog, Capybara, Iracoterio, Large Boar, Marmot.

## What to extract

The PO files contain official English translations keyed by asset path. Creature spawner blueprints live under paths like:

```
/Game/Blueprints/ShuaGuaiQi/SGQ_ChaoXue/BP_SGQ_BaoZi.Default__BP_SGQ_BaoZi_C.Name
/Game/Blueprints/ShuaGuaiQi/SGQ_DongWu/BP_SGQ_YeZhu.Default__BP_SGQ_YeZhu_C.Name
```

The PO entry format is:
```
#. SourceLocation: /Game/Blueprints/ShuaGuaiQi/SGQ_ChaoXue/BP_SGQ_BaoZi.Default__BP_SGQ_BaoZi_C.Name
msgid "美洲豹"
msgstr "Jaguar"
```

We need the Pinyin key (extracted from the blueprint filename) mapped to the `msgstr` value.

## PO file locations on the Windows modkit

```
C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\Localization\Game\en\Game.po
C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\Localization\Categories\en\Categories.po
C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\Localization\Properties\en\Properties.po
```

`Game.po` is the primary file. The others may have supplementary entries.

## Extraction script

Create `pipeline/extract_creature_names.py` (runs on Windows where PO files are accessible):

```python
"""
Extract creature display names from UE4 localization PO files.

Scans for SourceLocation paths matching BP_SGQ_* (base map spawners)
and BP_Beast_* (DLC spawners), extracts the .Name field translations.

Output: prints a JSON dict of { pinyin_key: english_name } to stdout.
"""
import re
import os
import json

MODKIT_ROOT = r"C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS"
PO_FILES = [
    os.path.join(MODKIT_ROOT, "Content", "Localization", "Game", "en", "Game.po"),
    os.path.join(MODKIT_ROOT, "Content", "Localization", "Categories", "en", "Categories.po"),
    os.path.join(MODKIT_ROOT, "Content", "Localization", "Properties", "en", "Properties.po"),
]

SOURCE_RE = re.compile(r"^#\.\s*SourceLocation:\s*(.+)$")
MSGID_RE  = re.compile(r'^msgid\s+"(.*)"$')
MSGSTR_RE = re.compile(r'^msgstr\s+"(.*)"$')

# Match creature spawner blueprints
# Base: /Game/Blueprints/ShuaGuaiQi/SGQ_*/BP_SGQ_<Name>...
# DLC:  /Game/Blueprints/Beast/BP_Beast_<Name>...  (or similar paths)
CREATURE_PATH_RE = re.compile(
    r"/(?:BP_SGQ_|BP_Beast_)([^.]+)\.Default__[^.]+_C\.(?:Name|DisplayName)$"
)


def parse_po(filepath):
    """Yield (source_loc, msgid, msgstr) from a PO file."""
    with open(filepath, encoding="utf-8-sig") as f:
        lines = f.readlines()
    source_loc = msgid = msgstr = None
    in_msgid = in_msgstr = False
    for line in lines:
        line = line.rstrip("\n")
        m = SOURCE_RE.match(line)
        if m:
            source_loc = m.group(1).strip()
            continue
        m = MSGID_RE.match(line)
        if m:
            in_msgid, in_msgstr = True, False
            msgid = m.group(1).replace('\\"', '"')
            continue
        m = MSGSTR_RE.match(line)
        if m:
            in_msgid, in_msgstr = False, True
            msgstr = m.group(1).replace('\\"', '"')
            continue
        if line.startswith('"') and line.endswith('"'):
            val = line[1:-1].replace('\\"', '"')
            if in_msgid and msgid is not None:
                msgid += val
            elif in_msgstr and msgstr is not None:
                msgstr += val
            continue
        if not line.strip():
            if source_loc and msgid is not None and msgstr is not None:
                yield source_loc, msgid, msgstr
            source_loc = msgid = msgstr = None
            in_msgid = in_msgstr = False
    if source_loc and msgid is not None and msgstr is not None:
        yield source_loc, msgid, msgstr


def extract_creature_names():
    results = {}
    for po_path in PO_FILES:
        if not os.path.exists(po_path):
            print(f"  SKIP (not found): {po_path}")
            continue
        print(f"  Scanning: {po_path}")
        for source_loc, msgid, msgstr in parse_po(po_path):
            if not msgstr:
                continue
            m = CREATURE_PATH_RE.search(source_loc)
            if m:
                bp_name = m.group(1)
                # For BP_SGQ_*, strip known suffixes to get Pinyin key
                # e.g. BP_SGQ_BaoZi_Elite_T1 → BaoZi
                clean = re.sub(r"_(Elite|Boss|T\d+|Kuang|Kurma|ChaoXue|DongWu|Combat|NO\d+).*$", "", bp_name)
                if clean not in results:
                    results[clean] = msgstr
                    print(f"    {clean} = {msgstr}  (zh: {msgid})")
    return results


if __name__ == "__main__":
    print("Extracting creature names from PO files...")
    names = extract_creature_names()
    print(f"\n{len(names)} creature names extracted")
    # Write to stdout as JSON
    print("\n--- JSON output ---")
    print(json.dumps(names, indent=2, ensure_ascii=False))
    # Also write to file
    out_path = os.path.join(os.path.dirname(__file__), "..", "data", "translations", "creature_names_po.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(names, f, indent=2, ensure_ascii=False)
    print(f"\nWritten to {out_path}")
```

## How to run

```powershell
cd C:\path\to\repo
python pipeline\extract_creature_names.py
```

Output goes to `data/translations/creature_names_po.json`. This will be merged with the existing `creature_names.json` on the Mac side — the PO values take priority as the authoritative source.

## What to commit

```
feat: extract creature name translations from PO localization files

Adds pipeline/extract_creature_names.py and outputs to
data/translations/creature_names_po.json for merging with
the existing manual creature_names.json.
```

Commit: `pipeline/extract_creature_names.py` and `data/translations/creature_names_po.json`.

## Notes

- The regex for creature paths may need tweaking once you see the actual PO entries — the path structure might vary. Run it and check what gets matched.
- DLC creatures (`BP_Beast_*`) are already mostly English in the blueprint names, but the PO file may have the canonical display name (e.g. "Coconut Crab" instead of "Lobster").
- If creature spawner names aren't in the PO files at all, check for a DataTable like `DT_AnimalInfo` or `DT_CreatureInfo` that might have display names — search the `Game/Exports/` directory.
- The existing `parse_localization.py` already has working PO parsing logic — this script is modeled after it.
