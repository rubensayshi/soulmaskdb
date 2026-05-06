# inspect_farm_actors_run.ps1 — Inspect BP_BuLuo_GengDi and BP_PanTaoPoint actors
#
# Extracts all properties of:
#   - BP_BuLuo_GengDi_C   (tribe farmland / barracks farm plots)
#   - BP_PanTaoPoint_C    (unknown gathering points — ~290 across GamePlay maps)
#
# Goal: find out whether GengDi actors carry a crop-type property, and what
# PanTaoPoint represents.  Prints a sample of raw property data.

$UassetGui  = "D:\UAssetGUI.exe"
$EngineVer  = "VER_UE4_27"
$BaseRoot   = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\Maps\Level01"
$DLCRoot    = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\AdditionMap01\Maps\DLC_Level01"
$MapsDir    = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\Maps"
$tmpDir     = [System.IO.Path]::GetTempPath()

$TargetClasses = @("BP_BuLuo_GengDi_C", "BP_PanTaoPoint_C")

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
    # try direct struct
    $v = $locProp.Value
    if ($v -and $null -ne $v.X) { return @([float]$v.X, [float]$v.Y, [float]$v.Z) }
    # try array wrapper
    if ($v -is [System.Collections.IEnumerable]) {
        foreach ($el in $v) {
            $inner = if ($el.PSObject.Properties['Value']) { $el.Value } else { $el }
            if ($inner -and $null -ne $inner.X) { return @([float]$inner.X, [float]$inner.Y, [float]$inner.Z) }
        }
    }
    return $null
}

function Scan-File($umapPath, $mapLabel) {
    $jsonOut = Join-Path $tmpDir "inspect_tile.json"
    if (Test-Path $jsonOut) { Remove-Item $jsonOut }

    $null = Start-Process -FilePath $UassetGui `
        -ArgumentList "tojson", "`"$umapPath`"", "`"$jsonOut`"", $EngineVer `
        -Wait -PassThru -NoNewWindow

    if (-not (Test-Path $jsonOut)) { return }

    try {
        $data    = Get-Content $jsonOut -Raw | ConvertFrom-Json
        $imports = $data.Imports
        $exports = $data.Exports
        $expMap  = @{}
        for ($i = 0; $i -lt $exports.Count; $i++) { $expMap[$i + 1] = $exports[$i] }

        foreach ($exp in $exports) {
            if ($exp.ClassIndex -ge 0) { continue }
            $imp = Resolve-Import $imports $exp.ClassIndex
            if (-not $imp) { continue }
            $cls = $imp.ObjectName
            if ($TargetClasses -notcontains $cls) { continue }

            # Get world position
            $rootComp = $null
            $rc = Get-Prop $exp.Data "RootComponent"
            if ($rc -and $rc.Value) {
                $rcIdx = [int]$rc.Value
                $rootComp = $expMap[$rcIdx]
            }
            $pos = $null
            if ($rootComp) {
                $locProp = Get-Prop $rootComp.Data "RelativeLocation"
                $pos = Resolve-Vector $locProp
            }
            if (-not $pos) {
                $locProp = Get-Prop $exp.Data "RelativeLocation"
                $pos = Resolve-Vector $locProp
            }

            Write-Host "`n--- $cls  [$mapLabel]  actor=$($exp.ObjectName)"
            if ($pos) {
                $lon = $pos[0] * 0.0050178419 + 2048.206056
                $lat = $pos[1] * -0.0050222678 + -2048.404771
                Write-Host "    pos: X=$($pos[0])  Y=$($pos[1])  Z=$($pos[2])  →  lon=$([math]::Round($lon,1))  lat=$([math]::Round($lat,1))"
            } else {
                Write-Host "    pos: (not found)"
            }

            # Dump all properties
            Write-Host "    Properties:"
            foreach ($prop in $exp.Data) {
                $valStr = try { ($prop.Value | ConvertTo-Json -Depth 3 -Compress) } catch { "[?]" }
                if ($valStr.Length -gt 200) { $valStr = $valStr.Substring(0, 200) + "..." }
                Write-Host "      $($prop.Name) = $valStr"
            }

            # Also dump child component props (RootComponent, etc.)
            $rc2 = Get-Prop $exp.Data "RootComponent"
            if ($rc2 -and $rc2.Value) {
                $rcIdx2 = [int]$rc2.Value
                $rcExp = $expMap[$rcIdx2]
                if ($rcExp) {
                    Write-Host "    RootComponent ($($rcExp.ObjectName)) props:"
                    foreach ($prop in $rcExp.Data) {
                        $valStr = try { ($prop.Value | ConvertTo-Json -Depth 3 -Compress) } catch { "[?]" }
                        if ($valStr.Length -gt 200) { $valStr = $valStr.Substring(0, 200) + "..." }
                        Write-Host "      $($prop.Name) = $valStr"
                    }
                }
            }
        }
    } catch {
        Write-Host "  ERROR: $_"
    } finally {
        if (Test-Path $jsonOut) { Remove-Item $jsonOut }
    }
}

# Scan BuLuo tiles (farm plots)
Write-Host "=== Scanning Level_BuLuo tiles for BP_BuLuo_GengDi_C ==="
Get-ChildItem "$BaseRoot\Level_BuLuo" -Filter "*.umap" | Sort-Object Name | ForEach-Object {
    $sizeMB = [math]::Round($_.Length / 1MB, 1)
    Write-Host "`n[BuLuo] $($_.BaseName) ($sizeMB MB)"
    Scan-File $_.FullName $_.BaseName
}
Get-ChildItem "$DLCRoot\DLC_Level01_Tribe" -Filter "*.umap" -ErrorAction SilentlyContinue | Sort-Object Name | ForEach-Object {
    $sizeMB = [math]::Round($_.Length / 1MB, 1)
    Write-Host "`n[DLC Tribe] $($_.BaseName) ($sizeMB MB)"
    Scan-File $_.FullName $_.BaseName
}

# Scan GamePlay maps for PanTaoPoint
Write-Host "`n=== Scanning GamePlay maps for BP_PanTaoPoint_C ==="
@(
    "$MapsDir\Level01\Level01_Hub\Level01_GamePlay.umap",
    "$MapsDir\Level01\Level01_Hub\Level01_GamePlay2.umap",
    "$DLCRoot\DLC_Level01_Hub\DLC_Level01_GamePlay.umap"
) | Where-Object { Test-Path $_ } | ForEach-Object {
    $label = [System.IO.Path]::GetFileNameWithoutExtension($_)
    $sizeMB = [math]::Round((Get-Item $_).Length / 1MB, 1)
    Write-Host "`n[GamePlay] $label ($sizeMB MB)"
    Scan-File $_ $label
}
