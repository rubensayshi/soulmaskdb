# parse_ore_deposits_run.ps1 — Extract ore deposit locations from all sublevel .umap files
# Companion to parse_ore_spawns_run.ps1 (which handles large Mineral Veins)
#
# Scans ALL relevant sublevel types:
#   - _Near streaming tiles (open world)
#   - Level01_KuangDong mine caves (copper, sulfur, etc.)
#   - Level_BuLuo tribe villages
#   - Level01_YiJi ruins
#   - DLC Ruins, Tribe, FloatingIslands, ShipCamp sublevels
#
# BP_Collections_* actors use SortedInstances: array of child StaticMeshComponent
# export indices, each with a direct FVector RelativeLocation.
# BoxComponent0 bounding-box markers are filtered out.
#
# Output: Game/Parsed/ore_deposits.json

$UassetGui  = "D:\UAssetGUI.exe"
$EngineVer  = "VER_UE4_27"
$ScriptDir  = Split-Path $MyInvocation.MyCommand.Path
$OutFile    = [System.IO.Path]::GetFullPath((Join-Path $ScriptDir "..\Game\Parsed\ore_deposits.json"))
$tmpDir     = [System.IO.Path]::GetTempPath()

$BaseRoot = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\Maps\Level01"
$DLCRoot  = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\AdditionMap01\Maps\DLC_Level01"

$OreTypeMap = @{
    "Clay"        = "Clay"
    "BlackStone"  = "Obsidian"
    "Iron"        = "Iron Ore"
    "Crystal"     = "Crystal"
    "Coal"        = "Coal Ore"
    "Common_Ice"  = "Ice"
    "Meteorites"  = "Meteorite Ore"
    "Cassiterite" = "Tin Ore"
    "Nitre"       = "Nitrate Ore"
    "Cuprite"     = "Copper Ore"
    "Sulphur"     = "Sulfur Ore"
    "SeaSalt"     = "Sea Salt"
    "Salt"        = "Salt Mine"
    "Phosphate"   = "Phosphate Ore"
}

# Exclude obvious non-ore Collections classes
$ExcludePatterns = @(
    "Shrub", "Tree", "Branch", "Pine", "Mushroom", "Vine", "ThornShrub", "LuHui",
    "Bone", "Carcass", "Egg", "Herbs", "PickUp", "Water", "Thatch",
    "Common_Rock_Small",
    # DLC game objects that share the BP_Collections_ prefix but are not ore deposits
    "ChuanSongMen", "XiuMianCang", "ZhuanHuaLu", "FangFuShe",
    # Ancient tech structures (Mysterious Stone Table) in ruins — not ore deposits
    "GaoKeJi"
)

function Get-Prop($dataArray, $name) {
    foreach ($p in $dataArray) { if ($p.Name -eq $name) { return $p } }
    return $null
}
function Resolve-FVector($val) {
    if ($val -and $null -ne $val.X -and $null -ne $val.Y -and $null -ne $val.Z) {
        return @([float]$val.X, [float]$val.Y, [float]$val.Z)
    }
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
    return $null
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

            $skip = $false
            foreach ($pat in $ExcludePatterns) { if ($cls -match $pat) { $skip=$true; break } }
            if ($skip) { continue }

            $oreType = Resolve-OreType $cls
            if ($null -eq $oreType) { $oreType = "Unknown" }

            # Decide extraction method:
            # - Cave-style: BP_Collections_ actor IS the HISMC (has NumBuiltInstances property).
            #   Positions are packed in the Extras binary field (64-byte header + 64-byte FMatrix each).
            # - Surface-style: BP_Collections_ actor has child StaticMeshComponents listed in
            #   SortedInstances, each carrying its own RelativeLocation.
            $numBuiltInstProp = Get-Prop $exp.Data "NumBuiltInstances"
            $isCaveHISMC = $numBuiltInstProp -ne $null

            if ($isCaveHISMC) {
                # --- Version B (cave): HISMC Extras binary ---
                if ($exp.Extras) {
                    try {
                        $bytes     = [Convert]::FromBase64String($exp.Extras)
                        if ($bytes.Length -lt 80) { continue }
                        $instCount = [BitConverter]::ToInt32($bytes, 12)
                        if ($instCount -le 0) { continue }

                        $headerSize   = 64
                        $instanceSize = 64
                        for ($fi = 0; $fi -lt $instCount; $fi++) {
                            $base = $headerSize + $fi * $instanceSize
                            if ($base + 12 -gt $bytes.Length) { break }
                            $posX = [BitConverter]::ToSingle($bytes, $base)
                            $posY = [BitConverter]::ToSingle($bytes, $base + 4)
                            $posZ = [BitConverter]::ToSingle($bytes, $base + 8)

                            $lon = $posX * 0.0050178419 + 2048.206056
                            $lat = $posY * -0.0050222678 + -2048.404771
                            if ($lon -lt -200 -or $lon -gt 4296 -or $lat -lt -4296 -or $lat -gt 0) { continue }

                            $nodes.Add(@{
                                map          = $mapLabel
                                actor_name   = "cave_${fi}"
                                ore_class    = $cls
                                ore_type     = $oreType
                                ore_category = "deposit"
                                pos_x        = $posX
                                pos_y        = $posY
                                pos_z        = $posZ
                            })
                        }
                    } catch { <# binary parse failed silently #> }
                }
            } else {
                # --- Version A: per-component (placed BP actors / surface style) ---
                # SortedInstances lists individual StaticMeshComponent exports, each with RelativeLocation.
                $smCount = 0
                $sortedProp = Get-Prop $exp.Data "SortedInstances"
                if ($sortedProp -and $sortedProp.Value) {
                    foreach ($instRef in $sortedProp.Value) {
                        $instIdx = [int]$instRef.Value
                        $instExp = $expMap[$instIdx]
                        if (-not $instExp) { continue }

                        # Keep only StaticMeshComponent / DefaultSceneRoot / JianZhuRootComp.
                        $instCls = $null
                        if ($instExp.ClassIndex -lt 0) {
                            $instImp = Resolve-Import $imports $instExp.ClassIndex
                            if ($instImp) { $instCls = $instImp.ObjectName }
                        }
                        $nameOk = ($instExp.ObjectName -match "^DefaultSceneRoot$|^JianZhuRootComp$")
                        $clsOk  = ($instCls -eq "StaticMeshComponent")
                        if (-not $nameOk -and -not $clsOk) { continue }

                        $loc = Get-Prop $instExp.Data "RelativeLocation"
                        if (-not $loc) { continue }
                        $vec = Resolve-FVector $loc.Value
                        if (-not $vec) { continue }

                        $lon = $vec[0] * 0.0050178419 + 2048.206056
                        $lat = $vec[1] * -0.0050222678 + -2048.404771
                        if ($lon -lt -200 -or $lon -gt 4296 -or $lat -lt -4296 -or $lat -gt 0) { continue }

                        $smCount++
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

                # --- Version B fallback: foliage-style HISMC with no child components ---
                # Fires when the actor has Extras binary but no StaticMeshComponent children
                # (e.g. open-world foliage instances of BP_Collections_ classes).
                if ($smCount -eq 0 -and $exp.Extras) {
                    try {
                        $bytes = [Convert]::FromBase64String($exp.Extras)
                        if ($bytes.Length -lt 80) { continue }
                        $instCount = [BitConverter]::ToInt32($bytes, 12)
                        if ($instCount -le 0) { continue }

                        $headerSize   = 64
                        $instanceSize = 64
                        for ($fi = 0; $fi -lt $instCount; $fi++) {
                            $base = $headerSize + $fi * $instanceSize
                            if ($base + 12 -gt $bytes.Length) { break }
                            $posX = [BitConverter]::ToSingle($bytes, $base)
                            $posY = [BitConverter]::ToSingle($bytes, $base + 4)
                            $posZ = [BitConverter]::ToSingle($bytes, $base + 8)

                            $lon = $posX * 0.0050178419 + 2048.206056
                            $lat = $posY * -0.0050222678 + -2048.404771
                            if ($lon -lt -200 -or $lon -gt 4296 -or $lat -lt -4296 -or $lat -gt 0) { continue }

                            $nodes.Add(@{
                                map          = $mapLabel
                                actor_name   = "foliage_${fi}"
                                ore_class    = $cls
                                ore_type     = $oreType
                                ore_category = "deposit"
                                pos_x        = $posX
                                pos_y        = $posY
                                pos_z        = $posZ
                            })
                        }
                    } catch { <# binary parse failed silently #> }
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

function Add-Dir($dir, $filter) {
    if (-not (Test-Path $dir)) { return }
    Get-ChildItem $dir -Filter $filter | Sort-Object Name | ForEach-Object {
        $script:tiles.Add(@{ Path=$_.FullName; Label=$_.BaseName })
    }
}

# Open-world Near streaming tiles (base + DLC)
Add-Dir "$BaseRoot\Level01_Hub"        "*_Near.umap"
Add-Dir "$DLCRoot\DLC_Level01_Hub"     "*_Near.umap"

# Mine caves — most likely source of copper, sulfur, phosphate, salt
Add-Dir "$BaseRoot\Level01_KuangDong"  "*.umap"

# Tribe villages
Add-Dir "$BaseRoot\Level_BuLuo"        "*.umap"
Add-Dir "$DLCRoot\DLC_Level01_Tribe"   "*.umap"

# Ruins / dungeons (base)
Add-Dir "$BaseRoot\Level01_YiJi"       "*.umap"
Add-Dir "$BaseRoot\Level_NieLian"      "*.umap"
Add-Dir "$BaseRoot\Level01_Hub"        "Level01_Seabed*.umap"

# Ruins / dungeons (DLC)
Add-Dir "$DLCRoot\DLC_Level01_Ruins"   "*.umap"
Add-Dir "$DLCRoot\DLC_Level01_FloatingIslands" "*.umap"
Add-Dir "$DLCRoot\DLC_Level01_ShipCamp" "*.umap"
Add-Dir "$DLCRoot\DLC_Level01_Hub"     "DLC_Level01_Seabed*.umap"

# DLC Egypt dungeons
Add-Dir "$DLCRoot\..\DLC_Egypt_Dungeons\Level\MonsterRoom" "*.umap"

Write-Host "Processing $($tiles.Count) tiles..."
$allNodes   = [System.Collections.Generic.List[hashtable]]::new()
$errors     = @()
$allClasses = @{}
$idx = 0

foreach ($tile in $tiles) {
    $idx++
    $sizeMB = [math]::Round((Get-Item $tile.Path).Length / 1MB, 1)
    Write-Host -NoNewline "[$idx/$($tiles.Count)] $($tile.Label) ($sizeMB MB)... "

    $result = Process-Tile $tile.Path $tile.Label

    if ($result.error) {
        Write-Host "ERROR$(if ($result.msg) { ': ' + $result.msg })"
        $errors += $tile.Label; continue
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
    Write-Host "`nWARNING: $unknown Unknown-type nodes. New classes found:"
    $allNodes | Where-Object { $_["ore_type"] -eq "Unknown" } |
        Group-Object { $_["ore_class"] } | Sort-Object Count -Descending |
        ForEach-Object { Write-Host ("  {0,5}  {1}" -f $_.Count, $_.Name) }
}

Write-Host "`nOutput: $OutFile"
