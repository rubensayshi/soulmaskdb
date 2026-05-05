# parse_ore_spawns_run.ps1 — Extract ore/mineral resource node locations from .umap files
# Counterpart to parse_spawns_run.ps1 (creature spawner extraction)
#
# Run on the Windows box with UAssetGUI installed.
# Output: Game/Parsed/ore_spawns.json
#
# Discovery notes (found via class name brute-force on Level01_GamePlay.umap):
# - Ore nodes use class BP_JianZhu_KuangMai_<Type>[0-2]_C (建筑矿脉 = building ore vein)
# - Ore type is encoded in English in the class name: Iron, Copper, Coal, Tin (base game)
# - DLC maps may add further types; unknown types fall back to the raw extracted word
# - Position via RootComponent -> RelativeLocation (same as creature spawners)
# - ~147 nodes in Level01_GamePlay.umap alone; expect 400-600 total across base+DLC

$MapsDir    = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\Maps"
$DLCMapsDir = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\AdditionMap01\Maps"
$UassetGui  = "D:\UAssetGUI.exe"
$EngineVer  = "VER_UE4_27"
$ScriptDir  = Split-Path $MyInvocation.MyCommand.Path
$OutFile    = [System.IO.Path]::GetFullPath((Join-Path $ScriptDir "..\Game\Parsed\ore_spawns.json"))

$OreClassPattern = "KuangMai"

$OreMaps = @(
    @{ Base=$MapsDir;    Rel="Level01\Level01_Hub\Level01_GamePlay.umap" },
    @{ Base=$MapsDir;    Rel="Level01\Level01_Hub\Level01_GamePlay2.umap" },
    @{ Base=$MapsDir;    Rel="Level01\Level01_Hub\Level01_GamePlay3.umap" },
    @{ Base=$DLCMapsDir; Rel="DLC_Level01\DLC_Level01_Hub\DLC_Level01_GamePlay.umap" },
    @{ Base=$DLCMapsDir; Rel="DLC_Level01\DLC_Level01_Hub\DLC_Level01_GamePlay2.umap" },
    @{ Base=$DLCMapsDir; Rel="DLC_Level01\DLC_Level01_Hub\DLC_Level01_GamePlay3.umap" }
)

# English ore type display names; raw class word used as fallback for unknown types
$OreTypeNames = @{
    "Iron"   = "Iron Ore"
    "Copper" = "Copper Ore"
    "Tin"    = "Tin Ore"
    "Coal"   = "Coal"
    # DLC types — add here if discovered in DLC maps
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

function Resolve-Import($imports, $idx) {
    if ($idx -ge 0) { return $null }
    $pos = (-$idx) - 1
    if ($pos -lt $imports.Count) { return $imports[$pos] }
    return $null
}

function Resolve-OreType($className) {
    # Class name pattern: BP_JianZhu_KuangMai_<Word>[0-2]_C
    if ($className -match "KuangMai_([A-Za-z]+)\d*_C") {
        $word = $Matches[1]
        if ($OreTypeNames.ContainsKey($word)) { return $OreTypeNames[$word] }
        return $word  # unknown type — use raw word, add to $OreTypeNames above
    }
    return "Unknown"
}

$allOreNodes = [System.Collections.Generic.List[hashtable]]::new()
$errors = @()
$tmpDir = [System.IO.Path]::GetTempPath()
$fileIdx = 0

foreach ($entry in $OreMaps) {
    $fileIdx++
    $rel      = $entry.Rel
    $umapPath = Join-Path $entry.Base $rel
    $mapName  = [System.IO.Path]::GetFileNameWithoutExtension($rel)
    $jsonOut  = Join-Path $tmpDir "ore_$mapName.json"

    if (-not (Test-Path $umapPath)) {
        Write-Host "[$fileIdx/$($OreMaps.Count)] SKIP (not found): $rel"
        continue
    }

    $sizeMB = [math]::Round((Get-Item $umapPath).Length / 1MB, 1)
    Write-Host "[$fileIdx/$($OreMaps.Count)] $mapName ($sizeMB MB)..."

    # Reuse existing export from creature spawn pipeline if present
    $spawnJson = Join-Path $tmpDir "$mapName.json"
    $sourceJson = if (Test-Path $spawnJson) { $spawnJson } else { $jsonOut }

    if (-not (Test-Path $sourceJson)) {
        if (Test-Path $jsonOut) { Remove-Item $jsonOut }
        $proc = Start-Process -FilePath $UassetGui `
            -ArgumentList "tojson", "`"$umapPath`"", "`"$jsonOut`"", $EngineVer `
            -Wait -PassThru -NoNewWindow
        if (-not (Test-Path $jsonOut)) {
            Write-Host "  SKIP: export failed"
            $errors += $rel; continue
        }
        $sourceJson = $jsonOut
    } else {
        Write-Host "  Reusing existing export: $sourceJson"
    }

    $jsonMB = [math]::Round((Get-Item $sourceJson).Length / 1MB, 1)
    Write-Host "  Parsing $jsonMB MB JSON..."

    try {
        $data    = Get-Content $sourceJson -Raw | ConvertFrom-Json
        $imports = $data.Imports
        $exports = $data.Exports
        $expMap  = @{}
        for ($i = 0; $i -lt $exports.Count; $i++) { $expMap[$i + 1] = $exports[$i] }

        $oreCount = 0
        foreach ($exp in $exports) {
            $imp = Resolve-Import $imports $exp.ClassIndex
            $cls = if ($imp) { $imp.ObjectName } else { "" }
            if ($cls -notmatch $OreClassPattern) { continue }

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
            if ($null -eq $posX) { continue }

            $oreType = Resolve-OreType $cls

            $allOreNodes.Add(@{
                map        = $mapName
                actor_name = $exp.ObjectName
                ore_class  = $cls
                ore_type   = $oreType
                pos_x      = $posX
                pos_y      = $posY
                pos_z      = $posZ
            })
            $oreCount++
        }
        Write-Host "  -> $oreCount ore nodes found"
    } catch {
        Write-Host "  ERROR: $_"
        $errors += $rel
    } finally {
        # Only delete temp file we created (not reused spawn pipeline exports)
        if ($sourceJson -eq $jsonOut -and (Test-Path $jsonOut)) { Remove-Item $jsonOut }
    }
}

$outDir = Split-Path $OutFile
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
$allOreNodes | ConvertTo-Json -Depth 3 | Set-Content $OutFile -Encoding UTF8

Write-Host "`n$('=' * 60)"
Write-Host "Total ore nodes : $($allOreNodes.Count)"
Write-Host "Maps OK/total   : $(($OreMaps.Count - $errors.Count - ($OreMaps | Where-Object { -not (Test-Path (Join-Path $_.Base $_.Rel)) }).Count))/$($OreMaps.Count)"
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

# Sanity check: unknown types
$unknown = ($allOreNodes | Where-Object { $_["ore_type"] -eq "Unknown" }).Count
if ($unknown -gt 0) {
    Write-Host "`nWARNING: $unknown nodes have Unknown ore type"
    $allOreNodes | Where-Object { $_["ore_type"] -eq "Unknown" } | Select-Object -First 5 | ForEach-Object {
        Write-Host "  $($_["actor_name"]) [$($_["ore_class"])]"
    }
}

Write-Host "`nOutput: $OutFile"
