$destZip = "D:\FModel.zip"
$destDir = "D:\FModel"

Write-Host "Fetching latest FModel release info..."
$release = Invoke-RestMethod "https://api.github.com/repos/4sval/FModel/releases/latest"
Write-Host "Latest version: $($release.tag_name)"

$asset = $release.assets | Where-Object { $_.name -eq "FModel.zip" } | Select-Object -First 1
Write-Host "Downloading FModel.zip ($([math]::Round($asset.size/1MB,1)) MB)..."
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $destZip -UseBasicParsing
Write-Host "Extracting to $destDir ..."
Expand-Archive -Path $destZip -DestinationPath $destDir -Force
Remove-Item $destZip

$exe = Get-ChildItem $destDir -Filter "FModel.exe" -Recurse | Select-Object -First 1
Write-Host "Done: $($exe.FullName) ($([math]::Round($exe.Length/1MB,1)) MB)"
