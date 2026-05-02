# Runs parse_spawns.ps1 with the pre-scanned list of matching .umap files
# (skips the slow binary scan phase)

$MapsDir    = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\Maps"
$DLCMapsDir = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\AdditionMap01\Maps"
$UassetGui  = "D:\UAssetGUI.exe"
$EngineVer  = "VER_UE4_27"
$ScriptDir  = Split-Path $MyInvocation.MyCommand.Path
$OutFile    = [System.IO.Path]::GetFullPath((Join-Path $ScriptDir "..\Game\Parsed\spawns.json"))

$SpawnerClassPatterns = @("ShuaGuaiQi", "SGQ", "ShuaGuai")

# Pre-scanned list — all .umap files confirmed to contain spawner refs
# Excludes DemoMap/TestMap/Level01_Main (OOM on export, dev-only content)
# Each entry is @(baseDir, relativePath)
# Each entry: @{ Base = $dir; Rel = "relative\path.umap" }
$KnownSpawnerMaps = @(
    # --- Base game maps (under $MapsDir) ---
    @{ Base=$MapsDir; Rel="DiXiaCheng\BossFang\FuBen_GuanQia_YiJi_Boss_333.umap" },
    @{ Base=$MapsDir; Rel="DiXiaCheng\BossFang\FuBen_GuanQia_YiJi_JingYing_332.umap" },
    @{ Base=$MapsDir; Rel="DiXiaCheng\GuanQia\FuBen_GuanQia_YiJi_FangJian_Da_232.umap" },
    @{ Base=$MapsDir; Rel="DiXiaCheng\GuanQia\FuBen_GuanQia_YiJi_FangJian_Da_332.umap" },
    @{ Base=$MapsDir; Rel="DiXiaCheng\GuanQia\FuBen_GuanQia_YiJi_FangJian_Da_333.umap" },
    @{ Base=$MapsDir; Rel="DiXiaCheng\GuanQia\FuBen_GuanQia_YiJi_FangJian_Treasure_111.umap" },
    @{ Base=$MapsDir; Rel="DiXiaCheng\GuanQia\FuBen_GuanQia_YiJi_FangJian_Xiao_111.umap" },
    @{ Base=$MapsDir; Rel="DiXiaCheng\GuanQia\FuBen_GuanQia_YiJi_FangJian_Xiao_112.umap" },
    @{ Base=$MapsDir; Rel="DiXiaCheng\GuanQia\FuBen_GuanQia_YiJi_FangJian_Xiao_121.umap" },
    @{ Base=$MapsDir; Rel="DiXiaCheng\GuanQia\FuBen_GuanQia_YiJi_FangJian_Xiao_122.umap" },
    @{ Base=$MapsDir; Rel="DiXiaCheng\GuanQia\FuBen_GuanQia_YiJi_FangJian_Zhong_133.umap" },
    @{ Base=$MapsDir; Rel="DiXiaCheng\GuanQia\FuBen_GuanQia_YiJi_FangJian_Zhong_221.umap" },
    @{ Base=$MapsDir; Rel="DiXiaCheng\GuanQia\FuBen_GuanQia_YiJi_FangJian_Zhong_222.umap" },
    @{ Base=$MapsDir; Rel="DiXiaCheng\GuanQia\FuBen_GuanQia_YiJi_FangJian_Zhong_231.umap" },
    @{ Base=$MapsDir; Rel="DiXiaCheng\TongDao\FuBen_GuanQia_YiJi_TongDao_Heng_111.umap" },
    @{ Base=$MapsDir; Rel="DiXiaCheng\TongDao\FuBen_GuanQia_YiJi_TongDao_Heng_131.umap" },
    @{ Base=$MapsDir; Rel="DiXiaCheng\TongDao\FuBen_GuanQia_YiJi_TongDao_Xie_133.umap" },
    @{ Base=$MapsDir; Rel="Level01\Level01_Hub\Level01_GamePlay.umap" },
    @{ Base=$MapsDir; Rel="Level01\Level01_Hub\Level01_GamePlay2.umap" },
    @{ Base=$MapsDir; Rel="Level01\Level01_Hub\Level01_GamePlay3.umap" },
    @{ Base=$MapsDir; Rel="Level01\Level01_YiJi\Level01_DiXiaYiJi04.umap" },
    @{ Base=$MapsDir; Rel="Level01\Level01_YiJi\Level01_YeWaiYiJi01.umap" },
    @{ Base=$MapsDir; Rel="Level01\Level01_YiJi\Level01_YJ_ShengYiJi03.umap" },
    @{ Base=$MapsDir; Rel="ZhanChang01\MonsterRoom\Lv_Battlefield_BossRoom_333.umap" },
    @{ Base=$MapsDir; Rel="ZhanChang01\MonsterRoom\Lv_Battlefield_CommonRoom_222_New.umap" },
    @{ Base=$MapsDir; Rel="ZhanChang01\MonsterRoom\Lv_Battlefield_EliteRoom_222_New.umap" },
    @{ Base=$MapsDir; Rel="ZhanChang01\MonsterRoom\Lv_Battlefield_EliteRoom_332.umap" },
    @{ Base=$MapsDir; Rel="ZhanChang01\MonsterRoom\Test_Lv_Battlefield_CommonRoom_331.umap" },
    @{ Base=$MapsDir; Rel="ZhanChang01\MonsterRoom\Test_Lv_Battlefield_EliteRoom_223.umap" },
    # --- DLC maps (under $DLCMapsDir / AdditionMap01) ---
    @{ Base=$DLCMapsDir; Rel="DLC_Level01\DLC_Level01_Hub\DLC_Level01_GamePlay.umap" },
    @{ Base=$DLCMapsDir; Rel="DLC_Level01\DLC_Level01_Hub\DLC_Level01_GamePlay2.umap" },
    @{ Base=$DLCMapsDir; Rel="DLC_Level01\DLC_Level01_Hub\DLC_Level01_GamePlay3.umap" },
    @{ Base=$DLCMapsDir; Rel="DLC_Level01\DLC_Level01_Ruins\DLC_Level01_HolyRuins_01.umap" },
    @{ Base=$DLCMapsDir; Rel="DLC_Level01\DLC_Level01_Ruins\DLC_Level01_UndergroundRuins_03.umap" },
    @{ Base=$DLCMapsDir; Rel="DLC_Egypt_Dungeons\Level\BossRoom\EG_Level_Relic_Boss_364.umap" },
    @{ Base=$DLCMapsDir; Rel="DLC_Egypt_Dungeons\Level\BossRoom\EG_Level_Relic_Elite_343.umap" },
    @{ Base=$DLCMapsDir; Rel="DLC_Egypt_Dungeons\Level\Corridor\EG_Level_Relic_Corridor_131.umap" },
    @{ Base=$DLCMapsDir; Rel="DLC_Egypt_Dungeons\Level\MonsterRoom\EG_Level_Relic_Room_L_232.umap" },
    @{ Base=$DLCMapsDir; Rel="DLC_Egypt_Dungeons\Level\MonsterRoom\EG_Level_Relic_Room_L_332.umap" },
    @{ Base=$DLCMapsDir; Rel="DLC_Egypt_Dungeons\Level\MonsterRoom\EG_Level_Relic_Room_L_333.umap" },
    @{ Base=$DLCMapsDir; Rel="DLC_Egypt_Dungeons\Level\MonsterRoom\EG_Level_Relic_Room_M_133.umap" },
    @{ Base=$DLCMapsDir; Rel="DLC_Egypt_Dungeons\Level\MonsterRoom\EG_Level_Relic_Room_M_221.umap" },
    @{ Base=$DLCMapsDir; Rel="DLC_Egypt_Dungeons\Level\MonsterRoom\EG_Level_Relic_Room_M_222.umap" },
    @{ Base=$DLCMapsDir; Rel="DLC_Egypt_Dungeons\Level\MonsterRoom\EG_Level_Relic_Room_M_231.umap" },
    @{ Base=$DLCMapsDir; Rel="DLC_Egypt_Dungeons\Level\MonsterRoom\EG_Level_Relic_Room_S_111.umap" },
    @{ Base=$DLCMapsDir; Rel="DLC_Egypt_Dungeons\Level\MonsterRoom\EG_Level_Relic_Room_S_112.umap" },
    @{ Base=$DLCMapsDir; Rel="DLC_Egypt_Dungeons\Level\MonsterRoom\EG_Level_Relic_Room_S_121.umap" },
    @{ Base=$DLCMapsDir; Rel="DLC_Egypt_Dungeons\Level\MonsterRoom\EG_Level_Relic_Room_S_122.umap" }
)

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

function Resolve-SCGClass($imports, $idx) {
    # SCGClass is an ObjectProperty whose Value is a negative import index.
    # The import's ObjectName is the _C class name; OuterIndex points to the package path.
    $imp = Resolve-Import $imports $idx
    if (-not $imp) { return $null }
    $name  = $imp.ObjectName  # e.g. "BP_SGQ_YeZhu_BuLuo_50_C"
    $outer = if ($imp.OuterIndex -ne 0) { Resolve-Import $imports $imp.OuterIndex } else { $null }
    if ($outer -and $outer.ObjectName) {
        return "$($outer.ObjectName).$name"   # e.g. "/Game/Blueprints/.../BP_SGQ_YeZhu_BuLuo_50.BP_SGQ_YeZhu_BuLuo_50_C"
    }
    return $name
}

$allSpawns = [System.Collections.Generic.List[hashtable]]::new()
$errors    = @()
$tmpDir    = [System.IO.Path]::GetTempPath()
$fileIdx   = 0

foreach ($entry in $KnownSpawnerMaps) {
    $fileIdx++
    $rel      = $entry.Rel
    $umapPath = Join-Path $entry.Base $rel
    $mapName  = [System.IO.Path]::GetFileNameWithoutExtension($rel)
    $sizeMB   = [math]::Round((Get-Item $umapPath).Length / 1MB, 1)
    $jsonOut  = Join-Path $tmpDir "spawns_$mapName.json"

    Write-Host "[$fileIdx/$($KnownSpawnerMaps.Count)] $mapName ($sizeMB MB)..."

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
        for ($i = 0; $i -lt $exports.Count; $i++) { $expMap[$i+1] = $exports[$i] }

        $spawnerCount = 0
        foreach ($exp in $exports) {
            $imp = Resolve-Import $imports $exp.ClassIndex
            $cls = if ($imp) { $imp.ObjectName } else { "" }
            $isSpawner = $false
            foreach ($pat in $SpawnerClassPatterns) { if ($cls -match $pat) { $isSpawner = $true; break } }
            if (-not $isSpawner) { continue }

            $posX = $posY = $posZ = $null; $yaw = $null; $scgClass = $null

            # SCGClass: which creature blueprint this spawner spawns
            $scgProp = Get-Prop $exp.Data "SCGClass"
            if ($scgProp -and $scgProp.Value -and $scgProp.Value -ne 0) {
                $scgClass = Resolve-SCGClass $imports $scgProp.Value
            }

            # Strategy A: RootComponent -> SceneComponent.RelativeLocation
            $rootProp = Get-Prop $exp.Data "RootComponent"
            if ($rootProp -and $rootProp.Value -gt 0) {
                $rootExp = $expMap[[int]$rootProp.Value]
                if ($rootExp) {
                    $loc = Get-Prop $rootExp.Data "RelativeLocation"
                    $vec = Resolve-Vector $loc
                    if ($vec) { $posX = $vec[0]; $posY = $vec[1]; $posZ = $vec[2] }

                    $rotProp = Get-Prop $rootExp.Data "RelativeRotation"
                    if ($rotProp -and $rotProp.Value -is [System.Collections.IEnumerable] -and $rotProp.Value.Count -gt 0) {
                        $frot = $rotProp.Value[0].Value
                        if ($frot -and $null -ne $frot.Yaw) { $yaw = [float]$frot.Yaw }
                    }
                }
            }

            # Strategy B: GuDingDianSCGTransList[0].Translation
            if ($null -eq $posX) {
                $gdProp = Get-Prop $exp.Data "GuDingDianSCGTransList"
                if ($gdProp -and $gdProp.Value -is [System.Collections.IEnumerable] -and $gdProp.Value.Count -gt 0) {
                    foreach ($sub in $gdProp.Value[0].Value) {
                        if ($sub.Name -eq "Translation") {
                            $fvec = if ($sub.Value -is [System.Collections.IEnumerable]) { $sub.Value[0].Value } else { $sub.Value }
                            if ($fvec -and $null -ne $fvec.X) { $posX=[float]$fvec.X; $posY=[float]$fvec.Y; $posZ=[float]$fvec.Z }
                            break
                        }
                    }
                }
            }

            $spawn = @{
                map           = $mapName
                map_path      = $rel
                spawner_class = $cls
                scg_class     = $scgClass
                actor_name    = $exp.ObjectName
                pos_x         = $posX
                pos_y         = $posY
                pos_z         = $posZ
            }
            if ($null -ne $yaw) { $spawn["rotation_yaw"] = $yaw }
            $allSpawns.Add($spawn)
            $spawnerCount++
        }
        Write-Host "  -> $spawnerCount actors  ($((($allSpawns | Where-Object { $null -ne $_['pos_x']}).Count)) with coords so far)"
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
$allSpawns | ConvertTo-Json -Depth 3 | Set-Content $OutFile -Encoding UTF8

Write-Host "`n$('='*60)"
Write-Host "Total spawns  : $($allSpawns.Count)"
Write-Host "Maps OK/total : $(($KnownSpawnerMaps.Count - $errors.Count))/$($KnownSpawnerMaps.Count)"
$withCoords = ($allSpawns | Where-Object { $null -ne $_["pos_x"] }).Count
Write-Host "With coords   : $withCoords/$($allSpawns.Count)"
if ($errors.Count -gt 0) { Write-Host "Failures      :"; $errors | ForEach-Object { Write-Host "  $_" } }

$classCounts = $allSpawns | Group-Object { $_["spawner_class"] } | Sort-Object Count -Descending
Write-Host "`nTop spawner classes:"
$classCounts | Select-Object -First 15 | ForEach-Object { Write-Host "  $($_.Count.ToString().PadLeft(5))  $($_.Name)" }

$mapCounts = $allSpawns | Group-Object { $_["map"] } | Sort-Object Count -Descending
Write-Host "`nPer-map breakdown:"
$mapCounts | Select-Object -First 20 | ForEach-Object { Write-Host "  $($_.Count.ToString().PadLeft(5))  $($_.Name)" }

Write-Host "`nOutput: $OutFile"
