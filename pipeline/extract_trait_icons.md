# Extract trait icons from Soulmask modkit

366 trait icon textures need to be exported as PNG, converted to webp, and placed in `Game/Icons/`.

## Where the textures live

All under the modkit content directory:

```
C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\UI\resource\JianYingIcon\ChuShenTianFu\
```

5 subfolders:

| Subfolder  | Count | Example filename                  |
| ---------- | ----- | --------------------------------- |
| TianFu     | 274   | tianfu_gongjilitisheng.uasset     |
| xihao      | 40    | Icon_NG_XiHao_ChouYan.uasset     |
| ChengHao   | 30    | ChengHao_bufenzhe.uasset          |
| ChuShen    | 14    | chushen_bodou.uasset              |
| BuLuo      | 8     | Icon_NG_BuLuo_DuYa.uasset        |

The exact 366 filenames (without extension) are listed in `pipeline/trait_icon_manifest.txt`.

## How to export

### Option A: FModel (recommended, GUI)

1. Download FModel from https://fmodel.app
2. Open the modkit `.pak` or point FModel at the Content directory
3. Navigate to `UI/resource/JianYingIcon/ChuShenTianFu/`
4. Select all 5 subfolders, right-click > Export Textures
5. FModel exports as PNG by default

### Option B: UModel (CLI, scriptable)

```powershell
# Download umodel from https://www.gildor.org/en/projects/umodel

$CONTENT = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content"
$OUT = "C:\temp\trait_icons"

# Export all textures under the trait icon folder
umodel.exe -export -png -path="$CONTENT" -out="$OUT" `
    "UI/resource/JianYingIcon/ChuShenTianFu/TianFu/*" `
    "UI/resource/JianYingIcon/ChuShenTianFu/xihao/*" `
    "UI/resource/JianYingIcon/ChuShenTianFu/ChengHao/*" `
    "UI/resource/JianYingIcon/ChuShenTianFu/ChuShen/*" `
    "UI/resource/JianYingIcon/ChuShenTianFu/BuLuo/*"
```

If UModel doesn't support wildcards, export the entire subtree:

```powershell
umodel.exe -export -png -path="$CONTENT" -out="$OUT" `
    -game=ue4.27 `
    "UI\resource\JianYingIcon\ChuShenTianFu\*"
```

### Option C: Bulk .uasset > PNG via UE4Editor commandlet

Since the modkit has UE4Editor, you can script a texture export:

```powershell
$CONTENT = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content"
$SRC = "$CONTENT\UI\resource\JianYingIcon\ChuShenTianFu"
$OUT = "C:\temp\trait_icons_png"

New-Item -ItemType Directory -Force -Path $OUT

# Find all .uasset files in the subtree
$files = Get-ChildItem -Path $SRC -Recurse -Filter "*.uasset"
Write-Host "Found $($files.Count) .uasset files"

# You may need to use UAssetGUI or another tool to convert each
# UE4 Texture2D .uasset -> PNG
```

## Convert PNG to webp

After exporting PNGs, convert to webp. Existing item icons in `Game/Icons/` are typically 128x128 or similar small sizes.

### With cwebp (install via `choco install webp` or download from Google):

```powershell
$PNG_DIR = "C:\temp\trait_icons"
$WEBP_DIR = "C:\temp\trait_icons_webp"

New-Item -ItemType Directory -Force -Path $WEBP_DIR

Get-ChildItem -Path $PNG_DIR -Recurse -Filter "*.png" | ForEach-Object {
    $outFile = Join-Path $WEBP_DIR "$($_.BaseName).webp"
    cwebp -q 90 $_.FullName -o $outFile
    Write-Host "Converted: $($_.BaseName)"
}

Write-Host "Done. Files in $WEBP_DIR"
```

### With Python (Pillow):

```powershell
pip install Pillow
python -c "
import os, glob
from PIL import Image

src = r'C:\temp\trait_icons'
dst = r'C:\temp\trait_icons_webp'
os.makedirs(dst, exist_ok=True)

for png in glob.glob(os.path.join(src, '**', '*.png'), recursive=True):
    name = os.path.splitext(os.path.basename(png))[0]
    img = Image.open(png)
    img.save(os.path.join(dst, f'{name}.webp'), 'webp', quality=90)
    print(f'  {name}')

print(f'Done: {len(os.listdir(dst))} files')
"
```

## Verify

After conversion, validate against the manifest:

```powershell
$manifest = Get-Content "pipeline\trait_icon_manifest.txt"
$exported = Get-ChildItem "C:\temp\trait_icons_webp" -Filter "*.webp" | ForEach-Object { $_.BaseName }

$missing = $manifest | Where-Object { $_ -notin $exported }
$extra   = $exported | Where-Object { $_ -notin $manifest }

Write-Host "Expected: $($manifest.Count)"
Write-Host "Exported: $($exported.Count)"
Write-Host "Missing:  $($missing.Count)"
if ($missing) { $missing | ForEach-Object { Write-Host "  MISSING: $_" } }
if ($extra)   { Write-Host "Extra files: $($extra.Count)" }
```

## Final step

Copy all 366 `.webp` files into `Game/Icons/` (same directory as existing item icons):

```powershell
Copy-Item "C:\temp\trait_icons_webp\*.webp" -Destination "Game\Icons\" -Force
```

Then commit and push. The rest of the pipeline wiring (DB schema, API, frontend) will be done on the Mac side.
