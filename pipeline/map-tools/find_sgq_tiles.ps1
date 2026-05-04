$mapsDir = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\Maps"
$pattern1 = [System.Text.Encoding]::UTF8.GetBytes("ShuaGuaiQi")
$pattern2 = [System.Text.Encoding]::UTF8.GetBytes("SGQ_")
$pattern3 = [System.Text.Encoding]::UTF8.GetBytes("BP_SGQ")

$umaps = Get-ChildItem $mapsDir -Recurse -Filter "*.umap" | Where-Object { $_.Length -lt 50MB }
Write-Host "Scanning $($umaps.Count) .umap files (under 50MB) for spawner refs..."

$results = @()
foreach ($umap in $umaps) {
    $bytes = [System.IO.File]::ReadAllBytes($umap.FullName)
    $found = $false
    $matchType = ""

    # Search for pattern1 (ShuaGuaiQi)
    for ($i = 0; $i -lt $bytes.Length - $pattern1.Length; $i++) {
        if ($bytes[$i] -eq $pattern1[0]) {
            $match = $true
            for ($j = 1; $j -lt $pattern1.Length; $j++) {
                if ($bytes[$i+$j] -ne $pattern1[$j]) { $match = $false; break }
            }
            if ($match) { $found = $true; $matchType = "ShuaGuaiQi"; break }
        }
    }

    # Search for pattern3 (BP_SGQ)
    if (-not $found) {
        for ($i = 0; $i -lt $bytes.Length - $pattern3.Length; $i++) {
            if ($bytes[$i] -eq $pattern3[0]) {
                $match = $true
                for ($j = 1; $j -lt $pattern3.Length; $j++) {
                    if ($bytes[$i+$j] -ne $pattern3[$j]) { $match = $false; break }
                }
                if ($match) { $found = $true; $matchType = "BP_SGQ"; break }
            }
        }
    }

    if ($found) {
        $sizeMB = [math]::Round($umap.Length / 1MB, 2)
        $results += [PSCustomObject]@{ Name = $umap.Name; SizeMB = $sizeMB; Dir = $umap.Directory.Name; Match = $matchType }
        Write-Host "  FOUND [$matchType]: $($umap.Name) ($sizeMB MB)"
    }
}

Write-Host "`nTotal tiles with spawner refs: $($results.Count)"
$results | Sort-Object SizeMB -Descending | Format-Table -AutoSize
