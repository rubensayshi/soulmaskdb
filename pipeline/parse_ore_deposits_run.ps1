# parse_ore_deposits_run.ps1 — Extract ore deposit locations from streaming _Near tile .umap files
# Companion to parse_ore_spawns_run.ps1 (which handles large Mineral Veins)
#
# Ore deposits (BP_Collections_* actors) are spread across 64 Near streaming tiles each
# for base game and DLC. This script exports each tile one at a time, scans for collection
# actors, extracts positions, then deletes the temp JSON before moving to the next tile.
#
# Output: Game/Parsed/ore_deposits.json

$UassetGui  = "D:\UAssetGUI.exe"
$EngineVer  = "VER_UE4_27"
$ScriptDir  = Split-Path $MyInvocation.MyCommand.Path
$OutFile    = [System.IO.Path]::GetFullPath((Join-Path $ScriptDir "..\Game\Parsed\ore_deposits.json"))
$tmpDir     = [System.IO.Path]::GetTempPath()

$BaseNearDir = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\Maps\Level01\Level01_Hub"
$DLCNearDir  = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\AdditionMap01\Maps\DLC_Level01\DLC_Level01_Hub"

# Ore deposit type resolution from class name.
# BP_Collections_<Key>[_Size]_C -> ore type.
# Non-ore collections are excluded via $ExcludePatterns below.
$OreTypeMap = @{
    # Class name fragment -> display name
    # Discovered by scanning all 128 Near tiles
    "Clay"        = "Clay"
    "BlackStone"  = "Obsidian"         # BP_Collections_BlackStone_Medium_C
    "Iron"        = "Iron Ore"         # BP_Collections_Iron_Medium_C
    "Crystal"     = "Crystal"          # BP_Collections_Crystal_Medium_C
    "Coal"        = "Coal Ore"         # BP_Collections_Coal_Medium_C
    "Common_Ice"  = "Ice"              # BP_Collections_Common_Ice_Medium_C
    "Meteorites"  = "Meteorite Ore"    # BP_Collections_Meteorites_Medium_C
    "Cassiterite" = "Tin Ore"          # BP_Collections_Cassiterite_Medium_C (cassiterite = tin ore mineral)
    "Nitre"       = "Nitrate Ore"      # BP_Collections_Nitre_Medium_C (nitre = potassium nitrate)
    "Cuprite"     = "Copper Ore"       # BP_Collections_Cuprite_Medium_C (cuprite = copper ore mineral)
    "Sulphur"     = "Sulfur Ore"       # BP_Collections_Sulphur_Medium_C
    "SeaSalt"     = "Sea Salt"         # BP_Collections_SeaSalt_Medium_C
    "Salt"        = "Salt Mine"        # BP_Collections_Salt_Medium_C
    "Phosphate"   = "Phosphate Ore"    # BP_Collections_Phosphate_Medium_C
}

# Class name fragments that are definitely NOT ore deposits — skip these entirely
$ExcludePatterns = @(
    "Shrub", "Tree", "Branch", "Pine", "Mushroom", "Vine", "ThornShrub", "LuHui",
    "Bone", "Carcass", "Egg", "Herbs", "PickUp", "Water", "Thatch",
    "Common_Rock_Small"  # generic stone rocks, not ore (19,000+ instances — too noisy for map)
)

function Get-Prop($dataArray, $name) {
    foreach ($p in $dataArray) { if ($p.Name -eq $name) { return $p } }
    return $null
}
function Resolve-FVector($val) {
    # Direct FVector object (BP_Collections_ instances use this format)
    if ($val -and $null -ne $val.X -and $null -ne $val.Y -and $null -ne $val.Z) {
        return @([float]$val.X, [float]$val.Y, [float]$val.Z)
    }
    # Array-wrapped FVector (BP_JianZhu_KuangMai_ veins use this format)
    if ($val -is [System.Collections.IEnumerable] -and $val.Count -gt 0) {
        $inner = $val[0].Value
        if ($inner -and $null -ne $inner.X -and $null -ne $inner.Y -and $null -ne $inner.Z) {
            return @([float]$inner.X, [float]$inner.Y, [float]$inner.Z)
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

function Resolve-OreType($className) {
    foreach ($entry in $OreTypeMap.GetEnumerator()) {
        if ($className -match $entry.Key) { return $entry.Value }
    }
    return $null  # null = unknown / non-ore
}

function Process-Tile($umapPath, $mapLabel) {
    $jsonOut = Join-Path $tmpDir "deposit_tile.json"
    if (Test-Path $jsonOut) { Remove-Item $jsonOut }

    $proc = Start-Process -FilePath $UassetGui `
        -ArgumentList "tojson", "`"$umapPath`"", "`"$jsonOut`"", $EngineVer `
        -Wait -PassThru -NoNewWindow

    if (-not (Test-Path $jsonOut)) { return @{ nodes=@(); error=$true } }

    try {
        $data    = Get-Content $jsonOut -Raw | ConvertFrom-Json
        $imports = $data.Imports
        $exports = $data.Exports
        $expMap  = @{}
        for ($i = 0; $i -lt $exports.Count; $i++) { $expMap[$i + 1] = $exports[$i] }

        $nodes = [System.Collections.Generic.List[hashtable]]::new()

        foreach ($exp in $exports) {
            $imp = Resolve-Import $imports $exp.ClassIndex
            if (-not $imp -or $imp.ObjectName -notmatch "^BP_Collections_") { continue }
            $cls = $imp.ObjectName

            # Skip non-ore collections
            $skip = $false
            foreach ($pat in $ExcludePatterns) { if ($cls -match $pat) { $skip=$true; break } }
            if ($skip) { continue }

            $oreType = Resolve-OreType $cls
            if ($null -eq $oreType) { $oreType = "Unknown" }

            # BP_Collections_ actors use SortedInstances: an array of export indices,
            # each pointing to a StaticMeshComponent that holds RelativeLocation (direct FVector).
            $sortedProp = Get-Prop $exp.Data "SortedInstances"
            if ($sortedProp -and $sortedProp.Value) {
                foreach ($instRef in $sortedProp.Value) {
                    $instIdx = [int]$instRef.Value
                    $instExp = $expMap[$instIdx]
                    if (-not $instExp) { continue }
                    $loc = Get-Prop $instExp.Data "RelativeLocation"
                    if (-not $loc) { continue }
                    $vec = Resolve-FVector $loc.Value
                    if (-not $vec) { continue }
                    $nodes.Add(@{
                        map          = $mapLabel
                        actor_name   = $instExp.ObjectName
                        ore_class    = $cls
                        ore_type     = $oreType
                        ore_category = "deposit"
                        pos_x        = $vec[0]
                        pos_y        = $vec[1]
                        pos_z        = $vec[2]
                    })
                }
            }
        }
        return @{ nodes=$nodes; error=$false }
    } catch {
        return @{ nodes=@(); error=$true; msg="$_" }
    } finally {
        if (Test-Path $jsonOut) { Remove-Item $jsonOut }
    }
}

# --- Build tile list ---
$tiles = [System.Collections.Generic.List[hashtable]]::new()

foreach ($f in (Get-ChildItem $BaseNearDir -Filter "*_Near.umap" | Sort-Object Name)) {
    $tiles.Add(@{ Path=$f.FullName; Label=$f.BaseName; DLC=$false })
}
foreach ($f in (Get-ChildItem $DLCNearDir -Filter "*_Near.umap" -ErrorAction SilentlyContinue | Sort-Object Name)) {
    $tiles.Add(@{ Path=$f.FullName; Label=$f.BaseName; DLC=$true })
}

Write-Host "Processing $($tiles.Count) Near tiles..."
$allNodes  = [System.Collections.Generic.List[hashtable]]::new()
$errors    = @()
$allClasses = @{}
$idx = 0

foreach ($tile in $tiles) {
    $idx++
    $sizeMB = [math]::Round((Get-Item $tile.Path).Length / 1MB, 1)
    Write-Host -NoNewline "[$idx/$($tiles.Count)] $($tile.Label) ($sizeMB MB)... "

    $result = Process-Tile $tile.Path $tile.Label

    if ($result.error) {
        Write-Host "ERROR$(if ($result.msg) { ': ' + $result.msg })"
        $errors += $tile.Label
        continue
    }

    $n = $result.nodes
    foreach ($node in $n) {
        $allNodes.Add($node)
        $cls = $node.ore_class
        if (-not $allClasses[$cls]) { $allClasses[$cls] = 0 }
        $allClasses[$cls]++
    }
    Write-Host "$($n.Count) deposits"
}

# Write output
$outDir = Split-Path $OutFile
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
$allNodes | ConvertTo-Json -Depth 3 | Set-Content $OutFile -Encoding UTF8

Write-Host "`n$('=' * 60)"
Write-Host "Total deposits  : $($allNodes.Count)"
Write-Host "Tiles OK/total  : $(($tiles.Count - $errors.Count))/$($tiles.Count)"
if ($errors.Count -gt 0) { Write-Host "Failures: $($errors -join ', ')" }

$typeCounts = $allNodes | Group-Object { $_["ore_type"] } | Sort-Object Count -Descending
Write-Host "`nOre types:"
$typeCounts | ForEach-Object { Write-Host ("  {0,5}  {1}" -f $_.Count, $_.Name) }

Write-Host "`nAll deposit classes found:"
$allClasses.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
    Write-Host ("  {0,5}  {1}" -f $_.Value, $_.Key)
}

$unknown = ($allNodes | Where-Object { $_["ore_type"] -eq "Unknown" }).Count
if ($unknown -gt 0) {
    Write-Host "`nWARNING: $unknown nodes classified as Unknown. Check class names above and update OreTypeMap."
    $allNodes | Where-Object { $_["ore_type"] -eq "Unknown" } |
        Group-Object { $_["ore_class"] } | Sort-Object Count -Descending |
        ForEach-Object { Write-Host ("  {0,5}  {1}" -f $_.Count, $_.Name) }
}

Write-Host "`nOutput: $OutFile"
