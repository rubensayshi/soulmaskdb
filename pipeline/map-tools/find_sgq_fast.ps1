$mapsDir = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\Maps"

$umaps = Get-ChildItem $mapsDir -Recurse -Filter "*.umap" | Where-Object { $_.Length -lt 50MB }
Write-Host "Scanning $($umaps.Count) .umap files (under 50MB)..."

$results = @()
foreach ($umap in $umaps) {
    # Use Select-String in binary mode - much faster than byte loop
    $hit = Select-String -Path $umap.FullName -Pattern "ShuaGuaiQi|BP_SGQ" -Encoding Byte -List -Quiet
    if ($hit) {
        $sizeMB = [math]::Round($umap.Length / 1MB, 2)
        $results += [PSCustomObject]@{ Name = $umap.Name; SizeMB = $sizeMB; Dir = $umap.Directory.Name; FullPath = $umap.FullName }
        Write-Host "  FOUND: $($umap.Name) ($sizeMB MB) [$($umap.Directory.Name)]"
    }
}

Write-Host "`nTotal tiles with spawner refs: $($results.Count)"
$results | Sort-Object SizeMB -Descending | Format-Table Name, SizeMB, Dir -AutoSize
