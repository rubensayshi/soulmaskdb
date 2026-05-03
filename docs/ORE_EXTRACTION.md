# Ore resource node extraction guide (Windows pipeline)

Instructions for a Claude Code agent running on the Windows box with the Soulmask modkit. The goal is to extract ore/mineral resource node locations from UE4 `.umap` level files so we can display them on a map in the Soulmask Codex web app.

## 1. Goal

The Soulmask Codex already shows creature spawn locations on an interactive map. Players also want to see **ore and mineral resource nodes** — where to find iron, copper, tin, coal, sulfur, etc.

The creature spawn pipeline (`parse_spawns_run.ps1` + `parse_spawns.py`) proves the coordinates live in `.umap` files and can be extracted with UAssetGUI. Ore resource nodes are placed in the same `.umap` files but use a **different actor class** than the `ShuaGuaiQi` creature spawner system. We need to discover that class, then extract positions.

## 2. Discovery phase (do this first)

We do NOT know the actor class name for ore resource nodes. This section describes how to find it.

### 2.1 Environment

```
Modkit:    C:\Program Files\Epic Games\SoulMaskModkit\
Project:   C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\
Content:   C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\
UAssetGUI: D:\UAssetGUI.exe
Engine:    VER_UE4_27
```

### 2.2 Target .umap files

Ore nodes are on the open-world gameplay maps (the same ones creature spawns come from):

**Base game:**
```
Content\Maps\Level01\Level01_Hub\Level01_GamePlay.umap
Content\Maps\Level01\Level01_Hub\Level01_GamePlay2.umap
Content\Maps\Level01\Level01_Hub\Level01_GamePlay3.umap
```

**DLC (Shifting Sands):**
```
Content\AdditionMap01\Maps\DLC_Level01\DLC_Level01_Hub\DLC_Level01_GamePlay.umap
Content\AdditionMap01\Maps\DLC_Level01\DLC_Level01_Hub\DLC_Level01_GamePlay2.umap
Content\AdditionMap01\Maps\DLC_Level01\DLC_Level01_Hub\DLC_Level01_GamePlay3.umap
```

You only need ONE map for the discovery phase. Use `Level01_GamePlay.umap` — it is the primary open-world map and will contain ore nodes.

### 2.3 Export the .umap to JSON

If you have already exported this map for the creature spawn pipeline, reuse that JSON. Otherwise:

```powershell
$UassetGui = "D:\UAssetGUI.exe"
$UmapPath  = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\Maps\Level01\Level01_Hub\Level01_GamePlay.umap"
$JsonOut   = "$env:TEMP\Level01_GamePlay.json"

Start-Process -FilePath $UassetGui `
    -ArgumentList "tojson", "`"$UmapPath`"", "`"$JsonOut`"", "VER_UE4_27" `
    -Wait -PassThru -NoNewWindow
```

**Warning:** These JSON files are very large (hundreds of MB). Loading them into PowerShell's `ConvertFrom-Json` uses several GB of RAM. Make sure you have enough memory.

```powershell
$data    = Get-Content $JsonOut -Raw | ConvertFrom-Json
$imports = $data.Imports
$exports = $data.Exports
```

### 2.4 Approach A: proximity search near known mine guards

We know mine guard spawners (`SGQ_TieKuangShouWei`, `SGQ_TongKuangShouWei`, etc.) are placed near the actual ore nodes. Find a guard's position, then examine all nearby actors.

**Step 1: build a helper to resolve import class names.**

```powershell
function Resolve-Import($imports, $idx) {
    if ($idx -ge 0) { return $null }
    $pos = (-$idx) - 1
    if ($pos -lt $imports.Count) { return $imports[$pos] }
    return $null
}

function Get-Prop($dataArray, $name) {
    foreach ($p in $dataArray) { if ($p.Name -eq $name) { return $p } }
    return $null
}

function Resolve-Vector($locProp) {
    if (-not $locProp) { return $null }
    $arr = $locProp.Value
    if ($arr -is [System.Collections.IEnumerable] -and $arr.Count -gt 0) {
        $fvec = $arr[0].Value
        if ($fvec -and $null -ne $fvec.X -and $null -ne $fvec.Y -and $null -ne $fvec.Z) {
            return @([float]$fvec.X, [float]$fvec.Y, [float]$fvec.Z)
        }
    }
    return $null
}
```

These helper functions are identical to the ones in `parse_spawns_run.ps1`. They resolve UAssetAPI import references and extract FVector values.

**Step 2: build a lookup from export index to export object.**

```powershell
$expMap = @{}
for ($i = 0; $i -lt $exports.Count; $i++) {
    $expMap[$i + 1] = $exports[$i]
}
```

Export references in UAssetAPI JSON are 1-indexed positive integers. The `$expMap` lets you jump from a `RootComponent` reference to the actual SceneComponent export that holds the position.

**Step 3: find a mine guard spawner and get its position.**

```powershell
$guard = $null
foreach ($exp in $exports) {
    if ($exp.ObjectName -match "TieKuangShouWei") {
        $guard = $exp
        break
    }
}

if (-not $guard) {
    Write-Host "No TieKuangShouWei found in this map — try TongKuangShouWei or MeiKuangShouWei"
    return
}

# Get guard position via RootComponent -> RelativeLocation
$guardPos = $null
$rootProp = Get-Prop $guard.Data "RootComponent"
if ($rootProp -and $rootProp.Value -gt 0) {
    $rootExp = $expMap[[int]$rootProp.Value]
    if ($rootExp) {
        $loc = Get-Prop $rootExp.Data "RelativeLocation"
        $guardPos = Resolve-Vector $loc
    }
}

if (-not $guardPos) {
    Write-Host "Could not resolve guard position"
    return
}

Write-Host "Guard position: X=$($guardPos[0]) Y=$($guardPos[1]) Z=$($guardPos[2])"
```

**Step 4: find all exports with positions near the guard.**

```powershell
$searchRadius = 10000  # UE4 units — roughly 100 meters in Soulmask

$nearby = @()
foreach ($exp in $exports) {
    $rootProp = Get-Prop $exp.Data "RootComponent"
    if (-not $rootProp -or $rootProp.Value -le 0) { continue }
    $rootExp = $expMap[[int]$rootProp.Value]
    if (-not $rootExp) { continue }
    $loc = Get-Prop $rootExp.Data "RelativeLocation"
    $vec = Resolve-Vector $loc
    if (-not $vec) { continue }

    $dx = $vec[0] - $guardPos[0]
    $dy = $vec[1] - $guardPos[1]
    $dist = [math]::Sqrt($dx * $dx + $dy * $dy)

    if ($dist -lt $searchRadius) {
        $imp = Resolve-Import $imports $exp.ClassIndex
        $cls = if ($imp) { $imp.ObjectName } else { "UNKNOWN" }
        $nearby += @{
            Name     = $exp.ObjectName
            Class    = $cls
            Distance = [math]::Round($dist)
            X        = $vec[0]
            Y        = $vec[1]
            Z        = $vec[2]
        }
    }
}

Write-Host "`nFound $($nearby.Count) actors within $searchRadius units of guard:"
$nearby | Sort-Object { $_.Distance } | ForEach-Object {
    Write-Host ("  {0,7} units  [{1}]  {2}" -f $_.Distance, $_.Class, $_.Name)
}
```

**What to look for in the output:** The mine guard will be the `HShuaGuaiQiBase` spawner you started with. Among the nearby actors, look for something that is NOT a spawner and has a name suggesting a resource/ore node. Likely class patterns:
- Something with `CaiJi` (采集 = gathering)
- Something with `ZiYuan` (资源 = resource)
- Something with `Kuang` (矿 = ore/mine)
- A StaticMeshActor or InteractiveFoliageActor (if ore nodes are just meshes with a harvesting component)
- A custom Blueprint class for harvestable resources

**Record the class name(s) you find.** You will need them for the extraction script.

### 2.5 Approach B: brute-force class name search

If approach A is inconclusive, scan ALL unique class names in the exports and look for patterns.

```powershell
$classCounts = @{}
foreach ($exp in $exports) {
    $imp = Resolve-Import $imports $exp.ClassIndex
    $cls = if ($imp) { $imp.ObjectName } else { "UNKNOWN" }
    if ($classCounts.ContainsKey($cls)) { $classCounts[$cls]++ }
    else { $classCounts[$cls] = 1 }
}

Write-Host "All actor classes in this map ($(($classCounts.Keys).Count) unique):"
$classCounts.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
    Write-Host ("  {0,6}  {1}" -f $_.Value, $_.Key)
}
```

In the output, look for class names matching these patterns (case-insensitive):

| Pattern     | Chinese  | Meaning            |
| ----------- | -------- | ------------------ |
| `CaiKuang`  | 采矿     | mining/excavation  |
| `KuangShi`  | 矿石     | ore/mineral stone  |
| `KuangWu`   | 矿物     | mineral            |
| `KuangChu`  | 矿处     | mine location      |
| `CaiJi`     | 采集     | gathering          |
| `ZiYuan`    | 资源     | resource           |
| `ShiTou`    | 石头     | stone              |
| `Ore`       | -        | English ore        |
| `Mine`      | -        | English mine       |
| `Rock`      | -        | English rock       |
| `Resource`  | -        | English resource   |
| `Harvest`   | -        | English harvest    |
| `Gather`    | -        | English gather     |
| `Interact`  | -        | Interactive object |

```powershell
$patterns = @("CaiKuang", "KuangShi", "KuangWu", "KuangChu", "CaiJi", "ZiYuan",
              "ShiTou", "Ore", "Mine", "Rock", "Resource", "Harvest", "Gather",
              "Interact", "Foliage", "Destructible")

foreach ($pat in $patterns) {
    $matches = $classCounts.GetEnumerator() | Where-Object { $_.Key -match $pat }
    if ($matches) {
        Write-Host "`nMatches for '$pat':"
        $matches | ForEach-Object { Write-Host ("  {0,6}  {1}" -f $_.Value, $_.Key) }
    }
}
```

Also search by **actor name** (the `ObjectName` field), not just class:

```powershell
$oreNamePatterns = @("Kuang", "CaiJi", "ShiTou", "ShuiJing", "LiuHuang", "Ore", "Mine", "Crystal")

foreach ($pat in $oreNamePatterns) {
    $matched = $exports | Where-Object { $_.ObjectName -match $pat }
    if ($matched) {
        # Deduplicate by class
        $byClass = @{}
        foreach ($m in $matched) {
            $imp = Resolve-Import $imports $m.ClassIndex
            $cls = if ($imp) { $imp.ObjectName } else { "UNKNOWN" }
            if (-not $byClass.ContainsKey($cls)) { $byClass[$cls] = 0 }
            $byClass[$cls]++
        }
        Write-Host "`nActors with '$pat' in name ($(($matched).Count) total):"
        $byClass.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
            Write-Host ("  {0,6}  {1}" -f $_.Value, $_.Key)
        }
        Write-Host "  Sample names:"
        $matched | Select-Object -First 5 | ForEach-Object {
            Write-Host "    $($_.ObjectName)"
        }
    }
}
```

### 2.6 Approach C: browse the Content Browser in UE4 Editor

If the above JSON searches fail, open the modkit in UE4 Editor and use the Content Browser:

1. Launch `UE4Editor.exe` with the WS project: `"C:\Program Files\Epic Games\SoulMaskModkit\Engine\Binaries\Win64\UE4Editor.exe" "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\WS.uproject"`
2. In the Content Browser, navigate to `Content/Blueprints/`
3. Search for: `CaiJi`, `Kuang`, `ZiYuan`, `Resource`, `Ore`, `Gather`
4. Look for Blueprint classes that seem to be harvestable resource nodes
5. Check `Content/Blueprints/DataTable/` for tables with "Kuang", "CaiJi", or "ZiYuan" in the name
6. If you find a promising Blueprint, open it and note the parent class — that parent class is what the `.umap` actors will reference

### 2.7 Approach D: check DataTables for ore node lists

The creature loot system uses DataTables (e.g. `DT_ShengWuCaiJiBao` for creature loot bags). There may be a similar DataTable listing ore resource nodes.

Check these paths on disk:

```powershell
$ContentDir = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content"

# Search for DataTable .uasset files with ore/resource-related names
Get-ChildItem -Path "$ContentDir\Blueprints\DataTable" -Recurse -Filter "*.uasset" |
    Where-Object { $_.Name -match "Kuang|CaiJi|ZiYuan|Ore|Mine|Resource" } |
    ForEach-Object { Write-Host $_.FullName }

# Also check the DLC DataTable paths
Get-ChildItem -Path "$ContentDir\AdditionMap01\BluePrints\DataTable" -Recurse -Filter "*.uasset" |
    Where-Object { $_.Name -match "Kuang|CaiJi|ZiYuan|Ore|Mine|Resource" } |
    ForEach-Object { Write-Host $_.FullName }
```

If you find a DataTable, export it with UAssetGUI:

```powershell
$TablePath = "..."  # fill in the .uasset path you found
$TableJson = "$env:TEMP\ore_datatable.json"
& $UassetGui tojson "$TablePath" "$TableJson" VER_UE4_27
```

Then inspect the JSON to see if it maps ore types to Blueprint classes or positions.

### 2.8 What to record from discovery

Before proceeding to the extraction script, document:

1. **The ore node actor class name(s)** — e.g. `BP_CaiJiWu_TieKuang_C` or `HCaiJiResource` or whatever you find
2. **How ore type is encoded** — is it in the actor name? A property on the actor? A referenced Blueprint?
3. **How position is stored** — most likely `RootComponent` -> `RelativeLocation` (same as creature spawners), but verify
4. **How many ore nodes exist** in `Level01_GamePlay.umap` — gives a rough count to sanity-check later
5. **Any properties relevant to ore type** — e.g. a property like `CaiJiType`, `ResourceType`, `KuangShiLeiXing`

## 3. Extraction script

Once you have identified the ore node class, create `pipeline/parse_ore_spawns_run.ps1`. This script follows the same pattern as `parse_spawns_run.ps1`.

### 3.1 Script template

```powershell
# parse_ore_spawns_run.ps1 — Extract ore/mineral resource node locations from .umap files
# Counterpart to parse_spawns_run.ps1 (creature spawner extraction)
#
# Run on the Windows box with UAssetGUI installed.
# Output: Game/Parsed/ore_spawns.json

$MapsDir    = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\Maps"
$DLCMapsDir = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\AdditionMap01\Maps"
$UassetGui  = "D:\UAssetGUI.exe"
$EngineVer  = "VER_UE4_27"
$ScriptDir  = Split-Path $MyInvocation.MyCommand.Path
$OutFile    = [System.IO.Path]::GetFullPath((Join-Path $ScriptDir "..\Game\Parsed\ore_spawns.json"))

# >>> FILL IN after discovery phase <<<
# Class name patterns that identify ore resource node actors
$OreClassPatterns = @(
    # e.g. "CaiJiWu", "KuangShi", "ResourceNode"
    # Add the class name(s) you discovered in section 2
)

# Maps to scan — only open-world gameplay maps contain ore nodes
$OreMaps = @(
    @{ Base=$MapsDir;    Rel="Level01\Level01_Hub\Level01_GamePlay.umap" },
    @{ Base=$MapsDir;    Rel="Level01\Level01_Hub\Level01_GamePlay2.umap" },
    @{ Base=$MapsDir;    Rel="Level01\Level01_Hub\Level01_GamePlay3.umap" },
    @{ Base=$DLCMapsDir; Rel="DLC_Level01\DLC_Level01_Hub\DLC_Level01_GamePlay.umap" },
    @{ Base=$DLCMapsDir; Rel="DLC_Level01\DLC_Level01_Hub\DLC_Level01_GamePlay2.umap" },
    @{ Base=$DLCMapsDir; Rel="DLC_Level01\DLC_Level01_Hub\DLC_Level01_GamePlay3.umap" }
)

# --- Helpers (same as parse_spawns_run.ps1) ---

function Get-Prop($dataArray, $name) {
    foreach ($p in $dataArray) { if ($p.Name -eq $name) { return $p } }
    return $null
}

function Resolve-Vector($locProp) {
    if (-not $locProp) { return $null }
    $arr = $locProp.Value
    if ($arr -is [System.Collections.IEnumerable] -and $arr.Count -gt 0) {
        $fvec = $arr[0].Value
        if ($fvec -and $null -ne $fvec.X -and $null -ne $fvec.Y -and $null -ne $fvec.Z) {
            return @([float]$fvec.X, [float]$fvec.Y, [float]$fvec.Z)
        }
    }
    return $null
}

function Resolve-Import($imports, $idx) {
    if ($idx -ge 0) { return $null }
    $pos = (-$idx) - 1
    if ($pos -lt $imports.Count) { return $imports[$pos] }
    return $null
}

# --- Ore type mapping ---
# >>> ADJUST after discovery phase <<<
# Map actor name fragments or property values to ore types.
# The key depends on how ore type is encoded — by actor name, by a property, or by a referenced BP.

# Strategy A: ore type encoded in the actor name (most likely)
$OreTypeFromName = @{
    "TieKuang"   = "Iron Ore"
    "TongKuang"  = "Copper Ore"
    "XiKuang"    = "Tin Ore"
    "MeiKuang"   = "Coal"
    "LiuHuang"   = "Sulfur"
    "LinKuang"   = "Phosphorus Ore"
    "YanKuang"   = "Salt"
    "JinKuang"   = "Gold Ore"
    "ShuiJing"   = "Crystal"
    "ShiTou"     = "Stone"
    # DLC ore types (add as discovered)
    # "Tie"      = "Iron Ore"  # sometimes shortened
}

function Resolve-OreType($actorName) {
    # Try matching known ore fragments in the actor name
    foreach ($entry in $OreTypeFromName.GetEnumerator()) {
        if ($actorName -match $entry.Key) {
            return $entry.Value
        }
    }
    return "Unknown"
}

# Strategy B: ore type from a property (uncomment if discovery shows this)
# function Resolve-OreTypeFromProp($exportData, $imports) {
#     $typeProp = Get-Prop $exportData "ResourceType"  # or "CaiJiType", etc.
#     if ($typeProp -and $typeProp.Value -lt 0) {
#         $imp = Resolve-Import $imports $typeProp.Value
#         if ($imp) { return $imp.ObjectName }
#     }
#     return "Unknown"
# }

# --- Main extraction loop ---

$allOreNodes = [System.Collections.Generic.List[hashtable]]::new()
$errors = @()
$tmpDir = [System.IO.Path]::GetTempPath()
$fileIdx = 0

foreach ($entry in $OreMaps) {
    $fileIdx++
    $rel      = $entry.Rel
    $umapPath = Join-Path $entry.Base $rel
    $mapName  = [System.IO.Path]::GetFileNameWithoutExtension($rel)
    $sizeMB   = [math]::Round((Get-Item $umapPath).Length / 1MB, 1)
    $jsonOut  = Join-Path $tmpDir "ore_$mapName.json"

    Write-Host "[$fileIdx/$($OreMaps.Count)] $mapName ($sizeMB MB)..."

    if (Test-Path $jsonOut) { Remove-Item $jsonOut }
    $proc = Start-Process -FilePath $UassetGui `
        -ArgumentList "tojson", "`"$umapPath`"", "`"$jsonOut`"", $EngineVer `
        -Wait -PassThru -NoNewWindow

    if (-not (Test-Path $jsonOut)) {
        Write-Host "  SKIP: export failed"
        $errors += $rel; continue
    }

    $jsonMB = [math]::Round((Get-Item $jsonOut).Length / 1MB, 1)
    Write-Host "  Parsing $jsonMB MB JSON..."

    try {
        $data    = Get-Content $jsonOut -Raw | ConvertFrom-Json
        $imports = $data.Imports
        $exports = $data.Exports
        $expMap  = @{}
        for ($i = 0; $i -lt $exports.Count; $i++) { $expMap[$i + 1] = $exports[$i] }

        $oreCount = 0
        foreach ($exp in $exports) {
            $imp = Resolve-Import $imports $exp.ClassIndex
            $cls = if ($imp) { $imp.ObjectName } else { "" }

            # Check if this actor's class matches our ore node pattern(s)
            $isOre = $false
            foreach ($pat in $OreClassPatterns) {
                if ($cls -match $pat) { $isOre = $true; break }
            }
            if (-not $isOre) { continue }

            # Extract position: RootComponent -> child export -> RelativeLocation
            $posX = $posY = $posZ = $null
            $rootProp = Get-Prop $exp.Data "RootComponent"
            if ($rootProp -and $rootProp.Value -gt 0) {
                $rootExp = $expMap[[int]$rootProp.Value]
                if ($rootExp) {
                    $loc = Get-Prop $rootExp.Data "RelativeLocation"
                    $vec = Resolve-Vector $loc
                    if ($vec) { $posX = $vec[0]; $posY = $vec[1]; $posZ = $vec[2] }
                }
            }

            # >>> ADJUST: if position is stored differently, add fallback here <<<
            if ($null -eq $posX) { continue }

            $oreType = Resolve-OreType $exp.ObjectName

            $node = @{
                map        = $mapName
                actor_name = $exp.ObjectName
                ore_class  = $cls
                ore_type   = $oreType
                pos_x      = $posX
                pos_y       = $posY
                pos_z      = $posZ
            }
            $allOreNodes.Add($node)
            $oreCount++
        }
        Write-Host "  -> $oreCount ore nodes found"
    } catch {
        Write-Host "  ERROR: $_"
        $errors += $rel
    } finally {
        if (Test-Path $jsonOut) { Remove-Item $jsonOut }
    }
}

# Write output
$outDir = Split-Path $OutFile
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
$allOreNodes | ConvertTo-Json -Depth 3 | Set-Content $OutFile -Encoding UTF8

# Summary
Write-Host "`n$('=' * 60)"
Write-Host "Total ore nodes : $($allOreNodes.Count)"
Write-Host "Maps OK/total   : $(($OreMaps.Count - $errors.Count))/$($OreMaps.Count)"
if ($errors.Count -gt 0) {
    Write-Host "Failures:"
    $errors | ForEach-Object { Write-Host "  $_" }
}

$typeCounts = $allOreNodes | Group-Object { $_["ore_type"] } | Sort-Object Count -Descending
Write-Host "`nOre types:"
$typeCounts | ForEach-Object { Write-Host ("  {0,5}  {1}" -f $_.Count, $_.Name) }

$classCounts = $allOreNodes | Group-Object { $_["ore_class"] } | Sort-Object Count -Descending
Write-Host "`nOre classes:"
$classCounts | ForEach-Object { Write-Host ("  {0,5}  {1}" -f $_.Count, $_.Name) }

$mapCounts = $allOreNodes | Group-Object { $_["map"] } | Sort-Object Count -Descending
Write-Host "`nPer-map breakdown:"
$mapCounts | ForEach-Object { Write-Host ("  {0,5}  {1}" -f $_.Count, $_.Name) }

Write-Host "`nOutput: $OutFile"
```

### 3.2 Key differences from creature spawner extraction

| Aspect           | Creature spawners                              | Ore nodes                          |
| ---------------- | ---------------------------------------------- | ---------------------------------- |
| Class filter     | `ShuaGuaiQi`, `SGQ`, `ShuaGuai`               | TBD from discovery                 |
| Position source  | `RootComponent` or `GuDingDianSCGTransList`    | Most likely `RootComponent` only   |
| Type resolution  | `SCGClass` property → creature Blueprint       | Actor name or a resource property  |
| Maps             | All maps (dungeons, ruins, open world)         | Open-world gameplay maps only      |
| Expected count   | ~6,800 across all maps                         | Probably dozens to low hundreds    |

### 3.3 Adapting the script

The template above uses **actor name matching** to determine ore type (`Resolve-OreType`). Depending on what the discovery phase reveals, you may need to adjust:

**If ore type is a property on the actor:**
```powershell
# Instead of Resolve-OreType from actor name, read a property
$typeProp = Get-Prop $exp.Data "ResourceType"  # or whatever the property is named
# If it's an import reference (negative int):
if ($typeProp -and $typeProp.Value -lt 0) {
    $typeImp = Resolve-Import $imports $typeProp.Value
    $oreType = $typeImp.ObjectName
}
# If it's an enum or string, just use the value directly:
$oreType = $typeProp.Value
```

**If ore type comes from a referenced Blueprint class (like SCGClass for creatures):**
```powershell
$refProp = Get-Prop $exp.Data "SomeResourceRef"
if ($refProp -and $refProp.Value -and $refProp.Value -ne 0) {
    $refImp = Resolve-Import $imports $refProp.Value
    $outer  = if ($refImp.OuterIndex -ne 0) { Resolve-Import $imports $refImp.OuterIndex } else { $null }
    $oreBlueprint = if ($outer) { "$($outer.ObjectName).$($refImp.ObjectName)" } else { $refImp.ObjectName }
    # Then map $oreBlueprint to an ore type name
}
```

**If ore nodes use a component-based system (StaticMeshComponent with a mesh name encoding the ore type):**
```powershell
# Check the mesh ref on a StaticMeshComponent
$meshProp = Get-Prop $rootExp.Data "StaticMesh"
if ($meshProp -and $meshProp.Value -lt 0) {
    $meshImp = Resolve-Import $imports $meshProp.Value
    $meshName = $meshImp.ObjectName  # e.g. "SM_TieKuang_01"
    $oreType = Resolve-OreType $meshName
}
```

## 4. Ore type identification

### 4.1 Chinese-English mapping

Known ore resources from the game's items and recipes data:

| Pinyin (actor name pattern) | Chinese | English         |
| --------------------------- | ------- | --------------- |
| `TieKuang`                  | 铁矿    | Iron Ore        |
| `TongKuang`                 | 铜矿    | Copper Ore      |
| `XiKuang`                   | 锡矿    | Tin Ore         |
| `MeiKuang`                  | 煤矿    | Coal            |
| `LiuHuang`                  | 硫磺    | Sulfur          |
| `LinKuang`                  | 磷矿    | Phosphorus Ore  |
| `YanKuang`                  | 盐矿    | Salt            |
| `JinKuang`                  | 金矿    | Gold Ore        |
| `ShuiJing`                  | 水晶    | Crystal         |
| `ShiTou`                    | 石头    | Stone           |

### 4.2 Matching strategy

The mine guard spawners in `spawns.json` encode the ore type directly in their actor names:

- `SGQ_TieKuangShouWei` = guards at iron mines
- `SGQ_TongKuangShouWei` = guards at copper mines
- `SGQ_XiKuangShouWei` = guards at tin mines

The ore node actors themselves will likely follow a similar naming convention. Look for the Pinyin fragments from the table above in the `ObjectName` of the discovered ore actors.

If the actor names don't encode ore type (e.g. they are all generic like `ResourceNode_001`), then the type must come from a property or referenced Blueprint. In that case, dump all properties of a few ore node actors to find the distinguishing field:

```powershell
# Dump all properties of the first few ore nodes for inspection
$oreExports = $exports | Where-Object {
    $imp = Resolve-Import $imports $_.ClassIndex
    $cls = if ($imp) { $imp.ObjectName } else { "" }
    $cls -match "YOUR_ORE_CLASS_PATTERN"
} | Select-Object -First 3

foreach ($oreExp in $oreExports) {
    Write-Host "`n=== $($oreExp.ObjectName) ==="
    foreach ($prop in $oreExp.Data) {
        Write-Host "  $($prop.Name) = $($prop.Value)"
    }
}
```

## 5. What to commit

After a successful extraction, commit these files to the `chore/windows-box-pipeline` branch:

### 5.1 Required files

| File                                 | What it is                                |
| ------------------------------------ | ----------------------------------------- |
| `Game/Parsed/ore_spawns.json`        | Extracted ore node locations              |
| `pipeline/parse_ore_spawns_run.ps1`  | The extraction script                     |

### 5.2 Output format

`ore_spawns.json` should be a JSON array:

```json
[
  {
    "map": "Level01_GamePlay",
    "actor_name": "SomeOreNode_TieKuang_001",
    "ore_class": "BP_CaiJiWu_TieKuang_C",
    "ore_type": "Iron Ore",
    "pos_x": 123456.0,
    "pos_y": -789012.0,
    "pos_z": 5000.0
  }
]
```

The fields:
- `map` — map file name without extension (matches `spawns.json` convention)
- `actor_name` — the UE4 actor name from the export
- `ore_class` — the resolved class name from the imports table
- `ore_type` — English ore type name from the mapping table above
- `pos_x`, `pos_y`, `pos_z` — UE4 world coordinates (same coordinate space as `spawns.json`)

### 5.3 Commit message

```
feat: extract ore/mineral resource node locations from .umap files

Adds pipeline/parse_ore_spawns_run.ps1 and Game/Parsed/ore_spawns.json
with ore node positions for the interactive map feature.
```

### 5.4 Discovery notes

If you discover anything unexpected about the ore node system, add a brief comment at the top of `parse_ore_spawns_run.ps1` documenting:
- The ore node class name(s) and how you identified them
- How ore type is encoded (actor name, property, or Blueprint reference)
- Any edge cases or anomalies (e.g. some ore types not in the mapping table)

## 6. Coordinate sanity check

### 6.1 Cross-reference with mine guards

Mine guard spawners are placed near ore nodes. Their positions are already in `spawns.json`. After extraction, verify that ore nodes are near known guard positions.

The mine guard actor name patterns from `spawns.json`:

| Pattern                | Ore type        | Count in spawns.json |
| ---------------------- | --------------- | -------------------- |
| `SGQ_TieKuangShouWei`  | Iron            | 11                   |
| `SGQ_TongKuangShouWei` | Copper          | 22                   |
| `SGQ_XiKuangShouWei`   | Tin             | 27                   |
| `SGQ_MeiKuangShouWei`  | Coal            | 23                   |
| `SGQ_LiuKuangShouWei`  | Sulfur          | 22                   |
| `SGQ_LinKuangShouWei`  | Phosphorus      | 21                   |
| `SGQ_YanKuangShouWei`  | Salt            | 11                   |

If you extract ore nodes, there should be ore nodes within ~10,000 UE4 units of each guard cluster.

### 6.2 Coordinate transform

To convert UE4 world coordinates to map tile pixels (for the web app's Leaflet map):

```
lon = pos_x * 0.0050178419 + 2048.206056
lat = pos_y * -0.0050222678 + -2048.404771
```

These constants are defined in `pipeline/parse_spawns.py` (lines 25-28) and used by the frontend map component.

Quick sanity check — valid open-world coordinates should produce `lon` and `lat` values roughly in the range `[0, 4096]`. If your converted coordinates are outside this range, the ore node is probably in a dungeon sublevel or the position extraction is wrong.

### 6.3 Expected counts

- There are 7 distinct ore types with mine guards. Each mine area typically has multiple nodes.
- Reasonable total: **50-500 ore nodes** across all 3 base game maps.
- If you get fewer than 20, you may be missing some ore classes. If you get more than 2,000, you may be including non-ore actors.
- Stone nodes are the most common. Specialized ores (gold, crystal) are rarer.

### 6.4 Quick verification script

Run this after extraction to check the output:

```powershell
$oreData = Get-Content $OutFile -Raw | ConvertFrom-Json

Write-Host "Total ore nodes: $($oreData.Count)"

# Type distribution
$oreData | Group-Object ore_type | Sort-Object Count -Descending | ForEach-Object {
    Write-Host ("  {0,5}  {1}" -f $_.Count, $_.Name)
}

# Coordinate range check
$xs = $oreData | ForEach-Object { $_.pos_x }
$ys = $oreData | ForEach-Object { $_.pos_y }
Write-Host "`nX range: $([math]::Round(($xs | Measure-Object -Minimum).Minimum)) to $([math]::Round(($xs | Measure-Object -Maximum).Maximum))"
Write-Host "Y range: $([math]::Round(($ys | Measure-Object -Minimum).Minimum)) to $([math]::Round(($ys | Measure-Object -Maximum).Maximum))"

# Convert a sample to map coords
$sample = $oreData[0]
$lon = [math]::Round($sample.pos_x * 0.0050178419 + 2048.206056)
$lat = [math]::Round($sample.pos_y * -0.0050222678 + -2048.404771)
Write-Host "`nSample: $($sample.ore_type) at UE4($($sample.pos_x), $($sample.pos_y)) -> map($lon, $lat)"

# Check for "Unknown" types
$unknown = ($oreData | Where-Object { $_.ore_type -eq "Unknown" }).Count
if ($unknown -gt 0) {
    Write-Host "`nWARNING: $unknown nodes have Unknown ore type"
    $oreData | Where-Object { $_.ore_type -eq "Unknown" } | Select-Object -First 5 | ForEach-Object {
        Write-Host "  $($_.actor_name) [$($_.ore_class)]"
    }
}
```

## 7. Alternative: if ore nodes are NOT in .umap files

If the discovery phase reveals that ore resource nodes are **not** placed as actors in `.umap` files, here are the most likely alternatives:

### 7.1 Foliage system

UE4's foliage instanced mesh system can place thousands of objects (rocks, trees, bushes) without individual actors. If ore nodes are foliage instances:
- They will NOT appear in the `Exports` array of the `.umap` JSON
- They will be in a `FoliageInstancedStaticMeshComponent` or `InstancedFoliageActor`
- Positions are stored in a `PerInstanceSMData` array with transform matrices
- Extraction is much more complex — you need to find the foliage actor, then iterate per-instance transforms

Look for exports with class `InstancedFoliageActor` or `FoliageInstancedStaticMeshComponent`:

```powershell
$foliage = $exports | Where-Object {
    $imp = Resolve-Import $imports $_.ClassIndex
    $cls = if ($imp) { $imp.ObjectName } else { "" }
    $cls -match "Foliage"
}
Write-Host "Foliage actors: $($foliage.Count)"
```

### 7.2 DataTable-driven placement

Ore nodes might be spawned at runtime from a DataTable that lists positions. Look for DataTables with transform/position columns:

```powershell
Get-ChildItem -Path "$ContentDir\Blueprints\DataTable" -Recurse -Filter "*.uasset" |
    ForEach-Object {
        $dt = $_.FullName
        $out = "$env:TEMP\dt_check.json"
        & $UassetGui tojson "$dt" "$out" VER_UE4_27 2>$null
        if (Test-Path $out) {
            $content = Get-Content $out -Raw
            if ($content -match "Kuang|CaiJi|Location|Position|Transform") {
                Write-Host "MATCH: $($_.Name)"
            }
            Remove-Item $out
        }
    }
```

### 7.3 Sublevel streaming

Ore nodes might be in a separate sublevel `.umap` that gets streamed in. Check for sublevels with "Kuang" or "CaiJi" in the name:

```powershell
Get-ChildItem -Path "$ContentDir\Maps" -Recurse -Filter "*.umap" |
    Where-Object { $_.Name -match "Kuang|CaiJi|ZiYuan|Resource|Ore|Mine" } |
    ForEach-Object { Write-Host $_.FullName }
```

If found, export those sublevels with UAssetGUI and search for ore node actors using the same approach as section 2.

### 7.4 Hardcoded in a Blueprint

Ore positions might be defined in a "world manager" Blueprint that spawns nodes at runtime. Search for Blueprints with many transform values:

```powershell
Get-ChildItem -Path "$ContentDir\Blueprints" -Recurse -Filter "*.uasset" |
    Where-Object { $_.Name -match "Kuang|ZiYuan|Resource|CaiJi" } |
    ForEach-Object { Write-Host $_.FullName }
```

### 7.5 What to do if none of the above works

If you cannot find ore nodes through any of these approaches, commit a summary of what you tried and what you found. Create a file `docs/ore_discovery_notes.md` with:
- Which approaches you tried
- What actor classes you found in the `.umap` files
- Any promising leads that need further investigation
- Screenshots of the Content Browser if useful

This information will help us figure out the next approach.

## 8. Phase 2: ore deposits (smaller harvestable rocks)

The extraction in phase 1 found all **Mineral Veins** (`BP_JianZhu_KuangMai_*`) — the large mineable rock formations. But cross-referencing with saraserenity.net reveals a **second, much larger system** of ore deposits that we're missing entirely.

### 8.1 What saraserenity shows vs what we have

Saraserenity splits ore into two groups: "Mineral Veins" and "Ore Deposits".

**Mineral Veins (DONE — our extraction matches exactly):**

| Type         | Ours | Saraserenity |
| ------------ | ---- | ------------ |
| Iron Vein    | 53   | 53           |
| Copper Vein  | 34   | 34           |
| Coal Vein    | 33   | 33           |
| Tin Vein     | 27   | 27           |

**Ore Deposits (MISSING — different actor class, 1,226 nodes):**

| Type          | Count |
| ------------- | ----- |
| Clay          | 328   |
| Obsidian      | 301   |
| Iron Ore      | 200   |
| Copper Ore    | 105   |
| Tin Ore       | 75    |
| Ice           | 49    |
| Coal Ore      | 33    |
| Sulfur Ore    | 30    |
| Crystal       | 28    |
| Phosphate Ore | 21    |
| Nitrate Ore   | 21    |
| Salt Mine     | 16    |
| Meteorite Ore | 14    |
| Crude Salt    | 5     |

These are the smaller harvestable rocks scattered around the world — a completely different actor class from `BP_JianZhu_KuangMai`.

### 8.2 Discovery: find the ore deposit actor class

Use the same discovery approaches from section 2, but this time you're looking for a **different** class. The veins are `BP_JianZhu_KuangMai_*` (建筑矿脉). The deposits likely use a different naming convention.

**Approach A: proximity search near known veins.**

You already know where veins are (they're in `ore_spawns.json`). Ore deposits for the same type should be nearby. Pick an iron vein coordinate and search for non-vein actors nearby:

```powershell
# Reuse the JSON export from Level01_GamePlay.umap (same one used for veins)
# Find actors near a known iron vein that are NOT KuangMai and NOT ShuaGuaiQi

$ironVein = $exports | Where-Object {
    $imp = Resolve-Import $imports $_.ClassIndex
    $cls = if ($imp) { $imp.ObjectName } else { "" }
    $cls -match "KuangMai_Iron"
} | Select-Object -First 1

# Get its position, then search nearby (same code as section 2.4)
# In the results, EXCLUDE classes you already know:
#   - KuangMai (veins, already extracted)
#   - ShuaGuaiQi / SGQ (creature spawners)
#   - SceneComponent, StaticMeshComponent (structural)
# What remains should include the ore deposit class.
```

**Approach B: brute-force class scan with high-count filter.**

There are 1,226 ore deposits on the base map. That's a large number of actors — look for classes with 100+ instances:

```powershell
# From the full class count list (section 2.5), look for classes with counts
# that match the expected total (~1,226) or individual ore type counts.
# The deposit class likely appears 200+ times (iron alone is 200).

$classCounts.GetEnumerator() | Where-Object { $_.Value -ge 20 } |
    Sort-Object Value -Descending | ForEach-Object {
    Write-Host ("  {0,6}  {1}" -f $_.Value, $_.Key)
}
```

Cross-reference the counts: if you see a class with ~328 instances, that's probably clay. ~301 is obsidian. ~200 is iron ore deposits.

**Approach C: search by Chinese keywords for deposits.**

Ore deposits might use different Chinese terminology than veins:

| Pattern      | Chinese | Meaning             |
| ------------ | ------- | ------------------- |
| `KuangChuang`| 矿床    | ore deposit/bed     |
| `KuangDian`  | 矿点    | ore point/spot      |
| `KuangKuai`  | 矿块    | ore chunk/block     |
| `CaiJiWu`    | 采集物   | gatherable object   |
| `CaiJiDian`  | 采集点   | gathering point     |
| `YanShi`     | 岩石    | rock                |
| `KuangShi`   | 矿石    | ore/mineral stone   |
| `NianTu`     | 黏土    | clay                |
| `HeiYaoShi`  | 黑曜石   | obsidian            |
| `LiuHuang`   | 硫磺    | sulfur              |
| `ShuiJing`   | 水晶    | crystal             |
| `Bing`       | 冰     | ice                  |
| `YunShi`     | 陨石    | meteorite           |
| `XiaoShi`    | 硝石    | nitrate             |

```powershell
$depositPatterns = @("KuangChuang", "KuangDian", "KuangKuai", "CaiJiWu",
                     "CaiJiDian", "YanShi", "KuangShi", "NianTu",
                     "HeiYaoShi", "LiuHuang", "ShuiJing", "YunShi",
                     "XiaoShi", "Bing", "Deposit", "Gather", "Harvest")

foreach ($pat in $depositPatterns) {
    $matches = $classCounts.GetEnumerator() | Where-Object { $_.Key -match $pat }
    if ($matches) {
        Write-Host "`nClass matches for '$pat':"
        $matches | ForEach-Object { Write-Host ("  {0,6}  {1}" -f $_.Value, $_.Key) }
    }
}

# Also search actor names
foreach ($pat in $depositPatterns) {
    $matched = $exports | Where-Object { $_.ObjectName -match $pat }
    if ($matched) {
        $byClass = @{}
        foreach ($m in $matched) {
            $imp = Resolve-Import $imports $m.ClassIndex
            $cls = if ($imp) { $imp.ObjectName } else { "UNKNOWN" }
            if (-not $byClass.ContainsKey($cls)) { $byClass[$cls] = 0 }
            $byClass[$cls]++
        }
        Write-Host "`nActor name matches for '$pat' ($(($matched).Count) total):"
        $byClass.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
            Write-Host ("  {0,6}  {1}" -f $_.Value, $_.Key)
        }
    }
}
```

### 8.3 Extraction script update

Once you identify the deposit class, add it to `parse_ore_spawns_run.ps1`:

```powershell
# Change the single pattern to an array that covers both systems:
$OreClassPatterns = @(
    "KuangMai",           # Mineral Veins (already working)
    "YOUR_DEPOSIT_CLASS"  # Ore Deposits (fill in after discovery)
)

# Update the class matching to use the array:
$isOre = $false
foreach ($pat in $OreClassPatterns) {
    if ($cls -match $pat) { $isOre = $true; break }
}
```

Also expand the `$OreTypeNames` mapping for the new deposit types:

```powershell
$OreTypeNames = @{
    # Existing vein types
    "Iron"      = "Iron Ore"
    "Copper"    = "Copper Ore"
    "Tin"       = "Tin Ore"
    "Coal"      = "Coal"
    # New deposit types (adjust keys based on what's in actor/class names)
    "NianTu"    = "Clay"
    "HeiYaoShi" = "Obsidian"
    "LiuHuang"  = "Sulfur Ore"
    "ShuiJing"  = "Crystal"
    "Bing"      = "Ice"
    "LinKuang"  = "Phosphate Ore"
    "XiaoShi"   = "Nitrate Ore"
    "YanKuang"  = "Salt Mine"
    "YunShi"    = "Meteorite Ore"
    "CuYan"     = "Crude Salt"
    "Clay"      = "Clay"
    "Obsidian"  = "Obsidian"
    "Sulfur"    = "Sulfur Ore"
    "Crystal"   = "Crystal"
    "Ice"       = "Ice"
    "Salt"      = "Salt Mine"
    "Meteorite" = "Meteorite Ore"
    "Nitrate"   = "Nitrate Ore"
    "Phosphate" = "Phosphate Ore"
}
```

### 8.4 Expected output

After adding deposits, the combined `ore_spawns.json` should have roughly:

| Category       | Expected count |
| -------------- | -------------- |
| Mineral Veins  | ~147 (current) |
| Ore Deposits   | ~1,226         |
| **Total**      | **~1,373**     |

### 8.5 What to commit

Same as section 5 — update the existing files:
- `Game/Parsed/ore_spawns.json` — now includes both veins and deposits
- `pipeline/parse_ore_spawns_run.ps1` — updated with deposit class pattern

Commit message:
```
feat: add ore deposit extraction (1,226 nodes) alongside existing mineral veins
```

### 8.6 Distinguishing veins from deposits in the output

Add an `ore_category` field to each entry so downstream processing can tell them apart:

```json
{
    "map": "Level01_GamePlay",
    "actor_name": "...",
    "ore_class": "BP_JianZhu_KuangMai_Iron1_C",
    "ore_type": "Iron Ore",
    "ore_category": "vein",
    "pos_x": 123456.0,
    "pos_y": -789012.0,
    "pos_z": 5000.0
}
```

Use `"vein"` for `KuangMai` classes, `"deposit"` for the new deposit class. This lets the frontend display them differently (different icons, filter toggles, etc.).
