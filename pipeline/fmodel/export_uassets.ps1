$contentRoot = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content"
$outputRoot  = "C:\Users\ruben\OneDrive\Documenten\Projects\SoulmaskDB\uasset_export"
$uassetGui   = "D:\UAssetGUI.exe"
$engineVer   = "VER_UE4_27"

$folders = @("Blueprints", "Data")
$assets = $folders | ForEach-Object { Get-ChildItem (Join-Path $contentRoot $_) -Recurse -Filter "*.uasset" }
$total  = $assets.Count
$i      = 0
$errors = @()

foreach ($asset in $assets) {
    $i++
    $rel  = $asset.FullName.Substring($contentRoot.Length + 1)
    $out  = Join-Path $outputRoot ($rel -replace '\.uasset$', '.json')
    $dir  = Split-Path $out -Parent

    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

    $outGz = $out + ".gz"
    & $uassetGui tojson $asset.FullName $out $engineVer 2>&1 | Out-Null

    if (Test-Path $out) {
        $inStream  = [System.IO.File]::OpenRead($out)
        $outStream = [System.IO.File]::Create($outGz)
        $gz        = [System.IO.Compression.GZipStream]::new($outStream, [System.IO.Compression.CompressionMode]::Compress)
        $inStream.CopyTo($gz)
        $gz.Dispose(); $outStream.Dispose(); $inStream.Dispose()
        Remove-Item $out
    } else {
        $errors += $asset.FullName
    }

    if ($i % 500 -eq 0) {
        Write-Host "[$i/$total] $rel"
    }
}

Write-Host "`nDone. $($total - $errors.Count)/$total exported."
if ($errors.Count -gt 0) {
    $errors | Set-Content "$outputRoot\_errors.txt"
    Write-Host "$($errors.Count) failures logged to _errors.txt"
}
