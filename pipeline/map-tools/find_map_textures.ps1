$contentRoot = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content"

Write-Host "=== Large .uasset files in UI folder (>1MB, potential map textures) ==="
Get-ChildItem (Join-Path $contentRoot "UI") -Recurse -Filter "*.uasset" -ErrorAction SilentlyContinue |
    Where-Object { $_.Length -gt 1MB } |
    Sort-Object Length -Descending |
    Select-Object -First 40 |
    ForEach-Object { Write-Host "$([math]::Round($_.Length/1MB,1)) MB  $($_.FullName.Replace($contentRoot,''))" }

Write-Host "`n=== Files with map/minimap keywords in name ==="
Get-ChildItem $contentRoot -Recurse -Filter "*.uasset" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -imatch 'WorldMap|MiniMap|MapTex|MapImg|MapBack|MapIcon|DiTu|Ditu' } |
    Select-Object @{N='MB';E={[math]::Round($_.Length/1MB,2)}}, @{N='Path';E={$_.FullName.Replace($contentRoot,'')}} |
    Sort-Object MB -Descending | Format-Table -AutoSize

Write-Host "`n=== UI subfolder listing ==="
Get-ChildItem (Join-Path $contentRoot "UI") -Directory -Depth 1 -ErrorAction SilentlyContinue |
    Select-Object Name | ForEach-Object { Write-Host "  $($_.Name)" }
