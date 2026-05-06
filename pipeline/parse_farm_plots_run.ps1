# parse_farm_plots_run.ps1 — Extract barracks farm plot locations from .umap files
#
# BP_BuLuo_GengDi_C actors represent tribe barracks farm plots.
# Each farm plot has a GengDiZuoWuData array of possible crops (weighted random pool).
# Farm plots are placed in GamePlay2 maps (not in the BuLuo sublevel tiles).
#
# Files containing GengDi actors:
#   - Level01_GamePlay2.umap          (base map, ~59 farm plots)
#   - DLC_Level01_GamePlay2.umap      (DLC map, ~25 farm plots)
#   - DLC_Level01_F5_Near.umap        (DLC streaming tile, small count)
#
# Output: Game/Parsed/farm_plots.json
#   Each entry: { map, lat, lon, tribe, crop, weight }
#   Where one farm plot yields N entries (one per possible crop).

$UassetGui  = "D:\UAssetGUI.exe"
$EngineVer  = "VER_UE4_27"
$ScriptDir  = Split-Path $MyInvocation.MyCommand.Path
$OutFile    = [System.IO.Path]::GetFullPath((Join-Path $ScriptDir "..\Game\Parsed\farm_plots.json"))
$MapsDir    = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\Maps"
$DLCMapsDir = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\AdditionMap01\Maps"
$tmpDir     = [System.IO.Path]::GetTempPath()

# Map from ZuoWuClass BlueprintGeneratedClass name → English crop name
# These are the BP_ZhongZhi_ZuoWu_*_C classes referenced in the import table.
$CropClassMap = @{
    "BP_ZhongZhi_ZuoWu_Agave_C"             = "Agave"
    "BP_ZhongZhi_ZuoWu_Aloe_C"              = "Aloe"
    "BP_ZhongZhi_ZuoWu_Chili_C"             = "Chili"
    "BP_ZhongZhi_ZuoWu_Corn_C"              = "Corn"
    "BP_ZhongZhi_ZuoWu_Cotton_C"            = "Cotton"
    "BP_ZhongZhi_ZuoWu_Peanut_C"            = "Peanut"
    "BP_ZhongZhi_ZuoWu_PoTaTo_C"            = "Potato"
    "BP_ZhongZhi_ZuoWu_Pumpkin_C"           = "Pumpkin"
    "BP_ZhongZhi_ZuoWu_Quinoa_C"            = "Quinoa"
    "BP_ZhongZhi_ZuoWu_Tobacco_C"           = "Tobacco"
    "BP_ZhongZhi_ZuoWu_Tomato_C"            = "Tomato"
    "BP_ZhongZhi_ZuoWu_CashewNut_BuLuo_C"   = "Cashew"
    "BP_ZhongZhi_ZuoWu_Coco_BuLuo_C"        = "Cacao"
    "BP_ZhongZhi_ZuoWu_Pawpaw_BuLuo_C"      = "Papaya"
    "BP_ZhongZhi_ZuoWu_Pomegranate_BuLuo_C" = "Guava"
    # DLC crops — use BP_Plant_Crop_*_C prefix (different from base game)
    "BP_Plant_Crop_Flax_C"                   = "Flax"
    "BP_Plant_Crop_Onion_C"                  = "Onion"
    "BP_Plant_Crop_Chufa_C"                  = "Chufa"
    "BP_Plant_Crop_Garlic_C"                 = "Garlic"
    "BP_Plant_Crop_Wheat_C"                  = "Wheat"
    "BP_Plant_Crop_Gingeli_C"               = "Sesame"
    "BP_Plant_Crop_Date_Tribe_C"             = "Date"
    "BP_Plant_Crop_Fig_C"                    = "Fig"
    "BP_Plant_Crop_Grape_C"                  = "Grape"
    "BP_Plant_Crop_Mint_C"                   = "Mint"
}

# Maps to scan
$ScanFiles = @(
    @{ Path="$MapsDir\Level01\Level01_Hub\Level01_GamePlay2.umap";          Map="base" },
    @{ Path="$DLCMapsDir\DLC_Level01\DLC_Level01_Hub\DLC_Level01_GamePlay2.umap"; Map="dlc" },
    @{ Path="$DLCMapsDir\DLC_Level01\DLC_Level01_Hub\DLC_Level01_F5_Near.umap";   Map="dlc" }
)

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

function Process-File($umapPath, $mapLabel) {
    $jsonOut = Join-Path $tmpDir "farm_tile.json"
    if (Test-Path $jsonOut) { Remove-Item $jsonOut }

    $proc = Start-Process -FilePath $UassetGui `
        -ArgumentList "tojson", "`"$umapPath`"", "`"$jsonOut`"", $EngineVer `
        -Wait -PassThru -NoNewWindow

    if (-not (Test-Path $jsonOut)) { return @{ rows=@(); error=$true } }

    try {
        $data    = Get-Content $jsonOut -Raw -Encoding UTF8 | ConvertFrom-Json
        $imports = $data.Imports
        $exports = $data.Exports
        $expMap  = @{}
        for ($i = 0; $i -lt $exports.Count; $i++) { $expMap[$i + 1] = $exports[$i] }

        # Build an import-index → class-name lookup for ZuoWuClass resolution
        $importClassLookup = @{}
        for ($i = 0; $i -lt $imports.Count; $i++) {
            $name = $imports[$i].ObjectName
            $importClassLookup[-($i + 1)] = $name
        }

        $rows = [System.Collections.Generic.List[hashtable]]::new()

        foreach ($exp in $exports) {
            if ($exp.ClassIndex -ge 0) { continue }
            $imp = Resolve-Import $imports $exp.ClassIndex
            if (-not $imp -or $imp.ObjectName -ne "BP_BuLuo_GengDi_C") { continue }

            # Get position from JianZhuRootComponent (or RootComponent fallback)
            $posX = $null; $posY = $null; $posZ = $null

            foreach ($compPropName in @("JianZhuRootComponent", "RootComponent")) {
                $rc = Get-Prop $exp.Data $compPropName
                if ($rc -and $rc.Value) {
                    $rcIdx = [int]$rc.Value
                    $rcExp = $expMap[$rcIdx]
                    if ($rcExp) {
                        $locProp = Get-Prop $rcExp.Data "RelativeLocation"
                        if ($locProp -and $locProp.Value) {
                            $raw = $locProp.Value
                            # raw can be an Object[] wrapping the VectorPropertyData,
                            # whose .Value is the actual FVector — same as ore deposit logic.
                            $v = if ($raw -is [System.Collections.IEnumerable] -and -not ($raw -is [string]) -and $raw.Count -gt 0) {
                                     $raw[0].Value
                                 } else { $raw }
                            if ($null -ne $v -and $null -ne $v.X) {
                                $posX = [float]$v.X; $posY = [float]$v.Y; $posZ = [float]$v.Z
                                break
                            }
                        }
                    }
                }
            }
            if ($null -eq $posX) { continue }

            $lon = $posX * 0.0050178419 + 2048.206056
            $lat = $posY * -0.0050222678 + -2048.404771
            if ($lon -lt -200 -or $lon -gt 4296 -or $lat -lt -4296 -or $lat -gt 0) { continue }

            # Tribe label from FolderPath
            $folderProp = Get-Prop $exp.Data "FolderPath"
            $tribe = if ($folderProp) { ($folderProp.Value -replace "^[A-Z]+_", "") } else { "Unknown" }

            # Parse GengDiZuoWuData crop pool
            $cropProp = Get-Prop $exp.Data "GengDiZuoWuData"
            if (-not $cropProp -or -not $cropProp.Value) { continue }

            foreach ($entry in $cropProp.Value) {
                if (-not $entry.Value) { continue }
                $entryProps = $entry.Value

                $weightProp  = $entryProps | Where-Object { $_.Name -eq "RandWeight" }
                $classProp   = $entryProps | Where-Object { $_.Name -eq "ZuoWuClass" }
                if (-not $weightProp -or -not $classProp) { continue }

                $weight = [float]$weightProp.Value
                $classIdx = [int]$classProp.Value
                $className = $importClassLookup[$classIdx]
                if (-not $className) { continue }

                $cropName = $CropClassMap[$className]
                if (-not $cropName) {
                    # Unknown crop — use the class word between last _ and _C
                    if ($className -match "_([A-Za-z]+)_C$") { $cropName = $Matches[1] }
                    else { $cropName = $className }
                    Write-Host "  UNKNOWN crop class: $className → $cropName"
                }

                $rows.Add(@{
                    map    = $mapLabel
                    lat    = [math]::Round($lat, 1)
                    lon    = [math]::Round($lon, 1)
                    tribe  = $tribe
                    crop   = $cropName
                    weight = $weight
                })
            }
        }

        return @{ rows=$rows; error=$false }
    } catch {
        return @{ rows=@(); error=$true; msg="$_" }
    } finally {
        if (Test-Path $jsonOut) { Remove-Item $jsonOut }
    }
}

# --- Run ---
$allRows = [System.Collections.Generic.List[hashtable]]::new()
$errors = @()

foreach ($entry in $ScanFiles) {
    if (-not (Test-Path $entry.Path)) {
        Write-Host "SKIP (not found): $($entry.Path)"
        continue
    }
    $label = [System.IO.Path]::GetFileNameWithoutExtension($entry.Path)
    $sizeMB = [math]::Round((Get-Item $entry.Path).Length / 1MB, 1)
    Write-Host -NoNewline "$label ($sizeMB MB)... "

    $result = Process-File $entry.Path $entry.Map
    if ($result.error) {
        Write-Host "ERROR$(if ($result.msg) { ': ' + $result.msg })"
        $errors += $label; continue
    }
    foreach ($row in $result.rows) { $allRows.Add($row) }
    Write-Host "$($result.rows.Count) crop-plot entries"
}

# Write output
$outDir = Split-Path $OutFile
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
$allRows | ConvertTo-Json -Depth 3 | Set-Content $OutFile -Encoding UTF8

Write-Host "`n$('=' * 60)"
Write-Host "Total entries  : $($allRows.Count)"

$farmPlotCount = ($allRows | Select-Object lat, lon, map -Unique).Count
Write-Host "Unique plots   : $farmPlotCount"

# Crop summary
$cropCounts = $allRows | Group-Object { $_["crop"] } | Sort-Object Count -Descending
Write-Host "`nCrop distribution (entries per crop):"
$cropCounts | ForEach-Object { Write-Host ("  {0,5}  {1}" -f $_.Count, $_.Name) }

# Tribe summary
$tribeCounts = $allRows | Group-Object { $_["tribe"] } | Sort-Object Count -Descending
Write-Host "`nTribe distribution:"
$tribeCounts | ForEach-Object { Write-Host ("  {0,5}  {1}" -f $_.Count, $_.Name) }

if ($errors.Count -gt 0) { Write-Host "`nFailures: $($errors -join ', ')" }
Write-Host "`nOutput: $OutFile"
