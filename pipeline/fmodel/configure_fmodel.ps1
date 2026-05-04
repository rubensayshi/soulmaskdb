# Pre-configure FModel for Soulmask so it opens ready to go
$configDir  = "$env:APPDATA\FModel"
$configFile = "$configDir\AppSettings.json"
$outputDir  = "C:\Users\ruben\OneDrive\Documenten\Projects\SoulmaskDB\fmodel_output"

New-Item -ItemType Directory -Path $configDir  -Force | Out-Null
New-Item -ItemType Directory -Path $outputDir  -Force | Out-Null

# FModel AppSettings.json — sets up the Soulmask game entry
$settings = @{
    Version         = 29
    LastOpenedFile  = ""
    OutputDirectory = $outputDir
    RawDataDirectory = ""
    PropertiesDirectory = ""
    TextureDirectory = $outputDir
    AudioDirectory   = ""
    ModelDirectory   = ""
    GameDirectory    = "E:\SteamLibrary\steamapps\common\Soulmask\WS\Content\Paks"
    SelectedDirectory = "E:\SteamLibrary\steamapps\common\Soulmask\WS\Content\Paks"
    UEVersion        = "GAME_UE4_27"
    GameName         = "Soulmask"
    # Game detection
    ManualGames = @(
        @{
            GameDirectory = "E:\SteamLibrary\steamapps\common\Soulmask\WS\Content\Paks"
            GameName      = "Soulmask"
            UEVersion     = "GAME_UE4_27"
        }
    )
    LastOpenedDirectoryIndex = 0
}

$settings | ConvertTo-Json -Depth 5 | Set-Content $configFile -Encoding UTF8
Write-Host "Config written to: $configFile"
Write-Host "Output directory : $outputDir"
Write-Host ""
Write-Host "Launch FModel with:"
Write-Host "  D:\FModel\FModel.exe"
