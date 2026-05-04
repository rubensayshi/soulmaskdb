# Search the Soulmask game executable for AES key (0x + 64 hex chars)
$exePath = "E:\SteamLibrary\steamapps\common\Soulmask\WS\Binaries\Win64\WS-Win64-Shipping.exe"

if (-not (Test-Path $exePath)) {
    Write-Host "Exe not found at: $exePath"
    Get-ChildItem "E:\SteamLibrary\steamapps\common\Soulmask" -Recurse -Filter "*.exe" -Depth 4 |
        Select-Object FullName, @{N='MB';E={[math]::Round($_.Length/1MB,0)}}
    exit
}

Write-Host "Reading $([math]::Round((Get-Item $exePath).Length/1MB,0)) MB exe..."
$bytes  = [System.IO.File]::ReadAllBytes($exePath)
$text   = [System.Text.Encoding]::ASCII.GetString($bytes)

# Look for 0x followed by exactly 64 hex chars
$pattern = '0x[0-9A-Fa-f]{64}'
$matches  = [regex]::Matches($text, $pattern)
Write-Host "Found $($matches.Count) AES key candidates:"
$matches | ForEach-Object { Write-Host "  $($_.Value)" }
