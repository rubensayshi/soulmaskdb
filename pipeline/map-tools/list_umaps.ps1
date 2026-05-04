Get-ChildItem 'C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\Maps' -Recurse -Filter '*.umap' |
    Select-Object FullName, @{N='SizeMB';E={[math]::Round($_.Length/1MB,1)}} |
    Sort-Object SizeMB -Descending |
    Format-Table -AutoSize
