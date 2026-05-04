Get-ChildItem 'C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\Maps' -Recurse -Filter '*.umap' |
    Select-Object @{N='Name';E={$_.Name}}, @{N='SizeMB';E={[math]::Round($_.Length/1MB,2)}}, @{N='Dir';E={$_.Directory.Name}} |
    Sort-Object SizeMB -Descending |
    Format-Table -AutoSize
