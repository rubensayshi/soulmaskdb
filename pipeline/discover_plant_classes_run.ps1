# discover_plant_classes_run.ps1 — Discover what BP_ class names crop/plant actors use
#
# The ore deposit script excludes LuHui (Aloe), confirming that some plants DO use
# BP_Collections_* with Chinese pinyin names.  This script scans the maps we suspect
# hold farm/wild-crop actors and reports ALL BP_ class names found so we can
# identify the exact names for food-crop plants (Corn, Chili, Tomato, etc.).
#
# Scans:
#   - Level01_GamePlay[1-3].umap  (open-world resource placement)
#   - DLC_Level01_GamePlay[1-3].umap
#   - Level_BuLuo/**/*.umap       (tribe-village tiles — barracks farms)
#   - DLC_Level01_Tribe/**/*.umap
#   - Level01_Hub/*_Near.umap     (open-world streaming tiles — wild plants)
#   - DLC_Level01_Hub/*_Near.umap
#
# Output: just printed to the console — copy the relevant class names into
#         parse_plant_spawns_run.ps1 once identified.

$UassetGui  = "D:\UAssetGUI.exe"
$EngineVer  = "VER_UE4_27"
$BaseRoot   = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\Maps\Level01"
$DLCRoot    = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\AdditionMap01\Maps\DLC_Level01"
$MapsDir    = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\Maps"
$tmpDir     = [System.IO.Path]::GetTempPath()

# Known crop-related Chinese pinyin strings to highlight in output
$CropHints = @(
    # English crop names (in case some classes use English)
    "Corn","Chili","Tomato","Cotton","Pumpkin","Peanut","Papaya","Guava",
    "Tobacco","Aloe","Agave","Cashew","Rubber","Flax","Date","Fig",
    "Garlic","Grape","Mint","Onion","Chufa","Herb","Herb",
    # Chinese pinyin for common crops
    "YuMi","LaJiao","FanQie","MianHua","NanGua","HuaSheng",
    "MuGua","ShiLiu","YanCao","LuHui","LongShe","YaoGuo",
    "XiangJiao","YaMa","YeZao","WuHuaGuo","DaSuan","PuTao",
    "BoHe","YangCong","YouSha","CaiDi","ZhiWu","NongTian",
    # Generic harvest-related prefixes
    "Harvest","Farm","Crop","Plant","Seed","Cai","Nong"
)

function Get-Prop($dataArray, $name) {
    foreach ($p in $dataArray) { if ($p.Name -eq $name) { return $p } }
    return $null
}

function Resolve-Import($imports, $idx) {
    if ($idx -ge 0) { return $null }
    $pos = (-$idx) - 1
    if ($pos -lt $imports.Count) { return $imports[$pos] }
    return $null
}

function Scan-Tile($umapPath) {
    $jsonOut = Join-Path $tmpDir "discover_tile.json"
    if (Test-Path $jsonOut) { Remove-Item $jsonOut }

    $proc = Start-Process -FilePath $UassetGui `
        -ArgumentList "tojson", "`"$umapPath`"", "`"$jsonOut`"", $EngineVer `
        -Wait -PassThru -NoNewWindow

    if (-not (Test-Path $jsonOut)) { return @{} }

    try {
        $data    = Get-Content $jsonOut -Raw | ConvertFrom-Json
        $imports = $data.Imports
        $exports = $data.Exports

        $classCounts = @{}

        foreach ($exp in $exports) {
            if ($exp.ClassIndex -ge 0) { continue }
            $imp = Resolve-Import $imports $exp.ClassIndex
            if (-not $imp) { continue }
            $cls = $imp.ObjectName
            if ($cls -notmatch "^BP_") { continue }
            if (-not $classCounts[$cls]) { $classCounts[$cls] = 0 }
            $classCounts[$cls]++
        }

        return $classCounts
    } catch {
        return @{}
    } finally {
        if (Test-Path $jsonOut) { Remove-Item $jsonOut }
    }
}

# --- Build tile list ---
$tiles = [System.Collections.Generic.List[hashtable]]::new()

function Add-Dir($dir, $filter) {
    if (-not (Test-Path $dir)) { return }
    Get-ChildItem $dir -Filter $filter | Sort-Object Name | ForEach-Object {
        $script:tiles.Add(@{ Path=$_.FullName; Label=$_.BaseName })
    }
}
function Add-DirRecurse($dir, $filter) {
    if (-not (Test-Path $dir)) { return }
    Get-ChildItem $dir -Filter $filter -Recurse | Sort-Object FullName | ForEach-Object {
        $script:tiles.Add(@{ Path=$_.FullName; Label=$_.BaseName })
    }
}

# GamePlay maps (large open-world resource placement)
$tiles.Add(@{ Path="$MapsDir\Level01\Level01_Hub\Level01_GamePlay.umap";  Label="Level01_GamePlay"  })
$tiles.Add(@{ Path="$MapsDir\Level01\Level01_Hub\Level01_GamePlay2.umap"; Label="Level01_GamePlay2" })
$tiles.Add(@{ Path="$MapsDir\Level01\Level01_Hub\Level01_GamePlay3.umap"; Label="Level01_GamePlay3" })
$tiles.Add(@{ Path="$DLCRoot\DLC_Level01_Hub\DLC_Level01_GamePlay.umap";  Label="DLC_GamePlay"  })
$tiles.Add(@{ Path="$DLCRoot\DLC_Level01_Hub\DLC_Level01_GamePlay2.umap"; Label="DLC_GamePlay2" })
$tiles.Add(@{ Path="$DLCRoot\DLC_Level01_Hub\DLC_Level01_GamePlay3.umap"; Label="DLC_GamePlay3" })

# Tribe villages — barracks farms
Add-DirRecurse "$BaseRoot\Level_BuLuo"      "*.umap"
Add-DirRecurse "$DLCRoot\DLC_Level01_Tribe" "*.umap"

# Open-world Near streaming tiles (sample only — these are many)
# Use just a handful of biome-representative tiles to keep runtime down
$sampleNear = @(
    # Western Rainforest (Corn, Chili, Cotton area)
    "*_2_2_Near.umap", "*_2_3_Near.umap", "*_3_2_Near.umap",
    # Great Grassland (Tobacco, Papaya area)
    "*_5_4_Near.umap", "*_6_4_Near.umap",
    # Mangrove Swamp (Cashew, Papaya area)
    "*_4_5_Near.umap", "*_5_5_Near.umap"
)
foreach ($pat in $sampleNear) {
    Add-Dir "$BaseRoot\Level01_Hub" $pat
    Add-Dir "$DLCRoot\DLC_Level01_Hub" $pat
}

$tiles = $tiles | Where-Object { Test-Path $_.Path }
Write-Host "Scanning $($tiles.Count) tiles for BP_ class names..."

# --- Aggregate counts across all tiles ---
$globalCounts = @{}
$idx = 0

foreach ($tile in $tiles) {
    $idx++
    $sizeMB = [math]::Round((Get-Item $tile.Path).Length / 1MB, 1)
    Write-Host -NoNewline "[$idx/$($tiles.Count)] $($tile.Label) ($sizeMB MB)... "
    $counts = Scan-Tile $tile.Path
    $total = ($counts.Values | Measure-Object -Sum).Sum
    Write-Host "$total actors across $($counts.Count) BP_ classes"
    foreach ($kv in $counts.GetEnumerator()) {
        if (-not $globalCounts[$kv.Key]) { $globalCounts[$kv.Key] = 0 }
        $globalCounts[$kv.Key] += $kv.Value
    }
}

Write-Host "`n$('=' * 70)"
Write-Host "ALL BP_ classes found (sorted by count):"
Write-Host "$('=' * 70)"
$sorted = $globalCounts.GetEnumerator() | Sort-Object Value -Descending
foreach ($kv in $sorted) {
    $cls = $kv.Key
    $cnt = $kv.Value
    # Highlight crop-related classes
    $isHit = $false
    foreach ($hint in $CropHints) { if ($cls -match $hint) { $isHit = $true; break } }
    if ($isHit) {
        Write-Host ("  *** {0,5}  {1}" -f $cnt, $cls)
    } else {
        Write-Host ("      {0,5}  {1}" -f $cnt, $cls)
    }
}

Write-Host "`n$('=' * 70)"
Write-Host "HIGHLIGHTED crop-hint classes:"
Write-Host "$('=' * 70)"
foreach ($kv in $sorted) {
    $cls = $kv.Key
    $cnt = $kv.Value
    foreach ($hint in $CropHints) {
        if ($cls -match $hint) {
            Write-Host ("  {0,5}  {1}" -f $cnt, $cls)
            break
        }
    }
}
