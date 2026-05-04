# Find Soulmask pak files and FModel anywhere on the system
Write-Host "=== Searching for Soulmask pak files ==="
$drives = (Get-PSDrive -PSProvider FileSystem).Root
foreach ($drive in $drives) {
    $pakDir = Join-Path $drive "SteamLibrary\steamapps\common\Soulmask\WS\Content\Paks"
    if (Test-Path $pakDir) {
        Write-Host "FOUND: $pakDir"
        Get-ChildItem $pakDir -Filter "*.pak" | Select-Object Name, @{N='GB';E={[math]::Round($_.Length/1GB,2)}}
    }
    # Also check default Steam location
    $pakDir2 = Join-Path $drive "Steam\steamapps\common\Soulmask\WS\Content\Paks"
    if (Test-Path $pakDir2) {
        Write-Host "FOUND: $pakDir2"
        Get-ChildItem $pakDir2 -Filter "*.pak" | Select-Object Name, @{N='GB';E={[math]::Round($_.Length/1GB,2)}}
    }
}

# Also check Steam libraryfolders.vdf for custom library paths
$libFolders = @(
    "C:\Program Files (x86)\Steam\steamapps\libraryfolders.vdf",
    "C:\Program Files\Steam\steamapps\libraryfolders.vdf"
)
foreach ($lf in $libFolders) {
    if (Test-Path $lf) {
        Write-Host "`nSteam library folders config:"
        Get-Content $lf | Where-Object { $_ -match '"path"' } | ForEach-Object { Write-Host "  $_" }
    }
}

Write-Host "`n=== Searching for FModel.exe ==="
foreach ($drive in $drives) {
    Get-ChildItem $drive -Filter "FModel.exe" -Recurse -Depth 5 -ErrorAction SilentlyContinue |
        Select-Object FullName, @{N='MB';E={[math]::Round($_.Length/1MB,1)}}
}
