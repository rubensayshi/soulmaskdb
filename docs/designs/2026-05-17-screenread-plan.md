# Screenread implementation plan

**Goal:** Desktop app that captures screenshots of the Soulmask tribesman list, recognizes each tribesman's name/level/clan/class/title and trait icons via local image processing, and displays the parsed roster in a searchable table.

**Architecture:** Tauri 2 app (React frontend + Rust backend) with a Python sidecar for image processing. Python uses OpenCV for card/icon detection, Tesseract for OCR, and `cv2.matchTemplate` for trait icon identification against a pre-built reference atlas.

**Tech Stack:** Tauri 2, React 18, TypeScript, Vite, Tailwind CSS, Zustand, Python 3, OpenCV, pytesseract, Pillow

---

## Prerequisites

Install before starting:

```bash
# Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Tesseract OCR engine (Mac)
brew install tesseract

# Python image processing deps
pip3 install opencv-python pytesseract Pillow numpy
```

Verify: `rustc --version`, `cargo --version`, `tesseract --version`, `python3 -c "import cv2; print(cv2.__version__)"`.

## File map

| File | Action | Responsibility |
|---|---|---|
| `src-tauri/Cargo.toml` | CREATE | Tauri 2 rust deps (tauri, xcap, serde, serde_json) |
| `src-tauri/src/main.rs` | CREATE | Tauri entry, command registration |
| `src-tauri/src/commands.rs` | CREATE | Tauri IPC commands (process_images, capture_screen, load/save roster) |
| `src-tauri/tauri.conf.json` | CREATE | Tauri config (window, sidecar, permissions) |
| `src-tauri/capabilities/default.json` | CREATE | Tauri v2 capability permissions |
| `package.json` | CREATE | React + Vite + Tailwind + Zustand |
| `vite.config.ts` | CREATE | Vite config for Tauri |
| `tsconfig.json` | CREATE | TypeScript config |
| `tailwind.config.ts` | CREATE | Tailwind with dark game theme |
| `index.html` | CREATE | Vite entry HTML |
| `src/main.tsx` | CREATE | React mount |
| `src/App.tsx` | CREATE | Router, layout shell |
| `src/lib/types.ts` | CREATE | Tribesman, Trait, ProcessResult interfaces |
| `src/lib/store.ts` | CREATE | Zustand roster store + localStorage |
| `src/lib/traits.ts` | CREATE | Load + index bundled traits.json |
| `src/pages/Roster.tsx` | CREATE | Main table view |
| `src/components/CapturePanel.tsx` | CREATE | Import/capture images, progress, results |
| `src/components/TraitIcon.tsx` | CREATE | Badge SVG + icon image + tooltip |
| `src/components/ReviewRow.tsx` | CREATE | Low-confidence correction UI |
| `sidecar/requirements.txt` | CREATE | Python deps |
| `sidecar/process.py` | CREATE | CLI entry: image path → JSON stdout |
| `sidecar/detect_cards.py` | CREATE | Stage 1: find tribesman card bounds |
| `sidecar/ocr_text.py` | CREATE | Stage 2: extract name/level/class/clan/title |
| `sidecar/match_traits.py` | CREATE | Stage 3-4: extract + match trait icons |
| `sidecar/gen_atlas.py` | CREATE | Build-time: composite icons onto badge shapes |
| `sidecar/test_process.py` | CREATE | Tests for the sidecar pipeline |
| `assets/traits.json` | COPY | Copied from `Game/Parsed/traits.json` at build time |
| `assets/atlas/` | GENERATED | Composited badge+icon reference images (gitignored) |
| `test/fixtures/` | CREATE | Sample game screenshots for dev |

---

## Task 1: Tauri project scaffolding

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tailwind.config.ts`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`
- Create: `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`, `src-tauri/src/main.rs`, `src-tauri/src/commands.rs`, `src-tauri/build.rs`

- [ ] **Step 1: Scaffold via create-tauri-app**

```bash
pnpm create tauri-app screenread-temp --template react-ts --manager pnpm --yes
```

Move generated files into the project root (we're already in the `screenread` directory):

```bash
cp -r screenread-temp/src-tauri .
cp screenread-temp/package.json screenread-temp/vite.config.ts screenread-temp/tsconfig.json screenread-temp/tsconfig.node.json screenread-temp/index.html .
mkdir -p src
cp -r screenread-temp/src/* src/
rm -rf screenread-temp
```

- [ ] **Step 2: Add Tailwind + Zustand + dependencies**

```bash
pnpm add zustand react-router-dom
pnpm add -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: Configure Tailwind**

Create `tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#161815',
        panel: '#242822',
        tile: '#2a2e27',
        text: '#d8dcc8',
        'text-dim': '#8b917e',
        green: '#8aa074',
        gold: '#b8a060',
        teal: '#6ea09a',
        danger: '#9a4050',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 4: Update vite.config.ts for Tauri**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { usePolling: true },
  },
  envPrefix: ['VITE_', 'TAURI_'],
})
```

- [ ] **Step 5: Replace src/styles.css with Tailwind imports**

```css
@import "tailwindcss";
@config "../tailwind.config.ts";

body {
  margin: 0;
  background: #161815;
  color: #d8dcc8;
  font-family: 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 6: Create minimal App.tsx**

```tsx
import './styles.css'

function App() {
  return (
    <div className="min-h-screen bg-bg text-text p-6">
      <h1 className="text-2xl font-bold text-green">Screenread</h1>
      <p className="text-text-dim mt-2">Tribesman roster scanner</p>
    </div>
  )
}

export default App
```

- [ ] **Step 7: Add Rust dependencies to src-tauri/Cargo.toml**

Add under `[dependencies]`:

```toml
[dependencies]
tauri = { version = "2", features = ["shell-open-api"] }
tauri-plugin-shell = "2"
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

- [ ] **Step 8: Configure tauri.conf.json sidecar + window**

Key settings in `tauri.conf.json`:

```json
{
  "app": {
    "windows": [
      {
        "title": "Screenread — Tribesman Roster",
        "width": 1280,
        "height": 800,
        "minWidth": 960,
        "minHeight": 600
      }
    ]
  }
}
```

- [ ] **Step 9: Create src-tauri/capabilities/default.json**

```json
{
  "identifier": "default",
  "description": "Default permissions",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "shell:allow-open",
    "dialog:allow-open",
    "fs:default"
  ]
}
```

- [ ] **Step 10: Verify build**

```bash
pnpm tauri dev
```

Expected: Tauri window opens with "Screenread" heading on dark background.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold Tauri 2 app with React + Vite + Tailwind"
```

---

## Task 2: Python sidecar environment

**Files:**
- Create: `sidecar/requirements.txt`

- [ ] **Step 1: Create requirements.txt**

```
opencv-python>=4.8
pytesseract>=0.3.10
Pillow>=10.0
numpy>=1.24
```

- [ ] **Step 2: Set up venv and install**

```bash
python3 -m venv sidecar/.venv
source sidecar/.venv/bin/activate
pip install -r sidecar/requirements.txt
```

- [ ] **Step 3: Verify imports**

```bash
python3 -c "import cv2, pytesseract, PIL, numpy; print('OK')"
```

- [ ] **Step 4: Add to .gitignore**

Append to `.gitignore`:

```
sidecar/.venv/
assets/atlas/
```

- [ ] **Step 5: Commit**

```bash
git add sidecar/requirements.txt .gitignore
git commit -m "feat: add Python sidecar environment"
```

---

## Task 3: Atlas generator

Composites each trait icon onto its badge shape (hexagon/diamond/shield) at a fixed reference size. Output used for template matching.

**Files:**
- Create: `sidecar/gen_atlas.py`
- Test: `sidecar/test_gen_atlas.py`

- [ ] **Step 1: Write the test**

```python
# sidecar/test_gen_atlas.py
import os, json, tempfile, pytest
from gen_atlas import build_atlas, source_to_badge_shape, BADGE_COLORS

def test_source_to_badge_shape():
    assert source_to_badge_shape("Normal") == "hexagon"
    assert source_to_badge_shape("XiHao") == "diamond"
    assert source_to_badge_shape("BornBuLuoCiTiao") == "shield"
    assert source_to_badge_shape("BornChuShen") == "shield"
    assert source_to_badge_shape("ChengHao") == "shield"
    assert source_to_badge_shape("JingLi") == "shield"
    assert source_to_badge_shape("XingGe") == "diamond"

def test_badge_colors_has_all_shapes():
    for shape in ("hexagon", "diamond", "shield"):
        assert shape in BADGE_COLORS
        assert "fill" in BADGE_COLORS[shape]
        assert "stroke" in BADGE_COLORS[shape]

def test_build_atlas_creates_files():
    traits_path = os.path.join(os.path.dirname(__file__), "..", "Game", "Parsed", "traits.json")
    icons_dir = os.path.join(os.path.dirname(__file__), "..", "Game", "Icons")
    if not os.path.exists(traits_path) or not os.path.exists(icons_dir):
        pytest.skip("Need traits.json + icons to run")
    
    with tempfile.TemporaryDirectory() as out_dir:
        stats = build_atlas(traits_path, icons_dir, out_dir, size=64)
        assert stats["generated"] > 0
        pngs = [f for f in os.listdir(out_dir) if f.endswith(".png")]
        assert len(pngs) == stats["generated"]
        # Check one file is actually a 64x64 image
        from PIL import Image
        img = Image.open(os.path.join(out_dir, pngs[0]))
        assert img.size == (64, 64)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd sidecar && python3 -m pytest test_gen_atlas.py -v
```

Expected: `ModuleNotFoundError: No module named 'gen_atlas'`

- [ ] **Step 3: Implement gen_atlas.py**

```python
# sidecar/gen_atlas.py
"""Generate reference atlas: composite each trait icon onto its badge shape."""
import json, os, sys, math
from PIL import Image, ImageDraw

BADGE_COLORS = {
    "hexagon": {"fill": (30, 42, 26), "stroke": (74, 106, 58)},
    "diamond": {"fill": (46, 38, 64), "stroke": (138, 112, 176)},
    "shield":  {"fill": (42, 37, 24), "stroke": (138, 122, 74)},
}

def source_to_badge_shape(source: str) -> str:
    if source == "Normal":
        return "hexagon"
    if source in ("XiHao", "XingGe"):
        return "diamond"
    return "shield"

def draw_hexagon(draw, size, fill, outline):
    cx, cy = size / 2, size / 2
    r = size * 0.46
    pts = []
    for i in range(6):
        angle = math.radians(60 * i - 90)
        pts.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    draw.polygon(pts, fill=outline)
    inner_r = r * 0.88
    inner_pts = []
    for i in range(6):
        angle = math.radians(60 * i - 90)
        inner_pts.append((cx + inner_r * math.cos(angle), cy + inner_r * math.sin(angle)))
    draw.polygon(inner_pts, fill=fill)

def draw_diamond(draw, size, fill, outline):
    cx, cy = size / 2, size / 2
    r = size * 0.46
    pts = [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)]
    draw.polygon(pts, fill=outline)
    inner_r = r * 0.88
    inner_pts = [(cx, cy - inner_r), (cx + inner_r, cy), (cx, cy + inner_r), (cx - inner_r, cy)]
    draw.polygon(inner_pts, fill=fill)

def draw_shield(draw, size, fill, outline):
    cx = size / 2
    r = size * 0.42
    top_y = size * 0.12
    mid_y = size * 0.55
    bot_y = size * 0.90
    pts = [
        (cx, top_y), (cx + r, top_y + r * 0.4), (cx + r, mid_y),
        (cx, bot_y), (cx - r, mid_y), (cx - r, top_y + r * 0.4),
    ]
    draw.polygon(pts, fill=outline)
    s = 0.90
    inner_pts = [(cx + (x - cx) * s, top_y + (y - top_y) * s + size * 0.02) for x, y in pts]
    draw.polygon(inner_pts, fill=fill)

BADGE_DRAWERS = {
    "hexagon": draw_hexagon,
    "diamond": draw_diamond,
    "shield": draw_shield,
}

def composite_icon(icon_path: str, shape: str, size: int) -> Image.Image:
    colors = BADGE_COLORS[shape]
    badge = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(badge)
    BADGE_DRAWERS[shape](draw, size, colors["fill"] + (255,), colors["stroke"] + (255,))

    icon = Image.open(icon_path).convert("RGBA")
    icon_size = int(size * 0.6)
    icon = icon.resize((icon_size, icon_size), Image.LANCZOS)
    offset = (size - icon_size) // 2
    badge.paste(icon, (offset, offset), icon)
    return badge

def build_atlas(traits_path: str, icons_dir: str, out_dir: str, size: int = 64) -> dict:
    with open(traits_path) as f:
        traits = json.load(f)

    # Deduplicate: one entry per icon_name, pick the source from the first occurrence
    icon_source = {}
    for t in traits:
        name = t.get("icon_name")
        if name and name not in icon_source:
            icon_source[name] = t["source"]

    os.makedirs(out_dir, exist_ok=True)
    generated = 0
    missing = 0
    for icon_name, source in icon_source.items():
        icon_path = os.path.join(icons_dir, icon_name + ".webp")
        if not os.path.exists(icon_path):
            missing += 1
            continue
        shape = source_to_badge_shape(source)
        img = composite_icon(icon_path, shape, size)
        img.save(os.path.join(out_dir, f"{icon_name}.png"))
        generated += 1

    return {"generated": generated, "missing": missing, "total": len(icon_source)}

if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--traits", default=os.path.join(os.path.dirname(__file__), "..", "Game", "Parsed", "traits.json"))
    p.add_argument("--icons", default=os.path.join(os.path.dirname(__file__), "..", "Game", "Icons"))
    p.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "assets", "atlas"))
    p.add_argument("--size", type=int, default=64)
    args = p.parse_args()
    stats = build_atlas(args.traits, args.icons, args.out, args.size)
    print(f"Atlas: {stats['generated']} generated, {stats['missing']} missing icons, {stats['total']} total")
```

- [ ] **Step 4: Run tests**

```bash
cd sidecar && python3 -m pytest test_gen_atlas.py -v
```

Expected: 3 tests pass.

- [ ] **Step 5: Generate the atlas**

```bash
cd sidecar && python3 gen_atlas.py
```

Expected: `Atlas: 366 generated, 0 missing icons, 366 total`. Files appear in `assets/atlas/`.

- [ ] **Step 6: Commit**

```bash
git add sidecar/gen_atlas.py sidecar/test_gen_atlas.py
git commit -m "feat: atlas generator — composite trait icons onto badge shapes"
```

---

## Task 4: Card detection

Finds tribesman card boundaries in a game screenshot using contour detection.

**Files:**
- Create: `sidecar/detect_cards.py`
- Test: `sidecar/test_detect_cards.py`

**Important:** This module needs a real game screenshot as a fixture to tune thresholds. Until a fixture is available, the implementation uses conservative defaults and the tests use a synthetic image.

- [ ] **Step 1: Write the test**

```python
# sidecar/test_detect_cards.py
import numpy as np
import cv2
from detect_cards import detect_cards, Card

def make_synthetic_grid(rows=3, cols=2, card_w=300, card_h=180, gap=10, border=4):
    """Create a synthetic 2-column grid of dark-bordered cards on a dark background."""
    img_w = cols * card_w + (cols + 1) * gap
    img_h = rows * card_h + (rows + 1) * gap
    img = np.zeros((img_h, img_w, 3), dtype=np.uint8)
    img[:] = (20, 20, 20)  # dark background

    expected = []
    for r in range(rows):
        for c in range(cols):
            x = gap + c * (card_w + gap)
            y = gap + r * (card_h + gap)
            # Draw card border
            cv2.rectangle(img, (x, y), (x + card_w, y + card_h), (60, 60, 60), border)
            # Fill card interior
            cv2.rectangle(img, (x + border, y + border),
                          (x + card_w - border, y + card_h - border), (40, 45, 40), -1)
            expected.append((x, y, card_w, card_h))
    return img, expected

def test_detect_cards_finds_all():
    img, expected = make_synthetic_grid(rows=3, cols=2)
    cards = detect_cards(img)
    assert len(cards) == 6
    for card in cards:
        assert card.w > 200
        assert card.h > 100

def test_detect_cards_returns_sorted_top_to_bottom_left_to_right():
    img, _ = make_synthetic_grid(rows=2, cols=2)
    cards = detect_cards(img)
    for i in range(len(cards) - 1):
        if cards[i].y == cards[i+1].y:
            assert cards[i].x <= cards[i+1].x
        else:
            assert cards[i].y <= cards[i+1].y

def test_detect_cards_empty_image():
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    cards = detect_cards(img)
    assert len(cards) == 0
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd sidecar && python3 -m pytest test_detect_cards.py -v
```

Expected: `ModuleNotFoundError: No module named 'detect_cards'`

- [ ] **Step 3: Implement detect_cards.py**

```python
# sidecar/detect_cards.py
"""Stage 1: Detect tribesman card boundaries in a screenshot."""
import cv2
import numpy as np
from dataclasses import dataclass

@dataclass
class Card:
    x: int
    y: int
    w: int
    h: int

    def crop(self, img: np.ndarray) -> np.ndarray:
        return img[self.y:self.y + self.h, self.x:self.x + self.w]

# Card layout: relative offsets within a card (as fractions of card width/height).
# Tuned against real game screenshots — update these after fixture testing.
LAYOUT = {
    "name":       {"x": 0.03, "y": 0.02, "w": 0.55, "h": 0.22},
    "level_line": {"x": 0.03, "y": 0.22, "w": 0.70, "h": 0.18},
    "title":      {"x": 0.03, "y": 0.40, "w": 0.55, "h": 0.15},
    "trait_row":  {"x": 0.02, "y": 0.58, "w": 0.70, "h": 0.38},
    "status":     {"x": 0.60, "y": 0.75, "w": 0.38, "h": 0.22},
}

# Minimum card dimensions (pixels) to filter noise
MIN_CARD_W = 150
MIN_CARD_H = 80
# Expected card aspect ratio range (w/h)
MIN_ASPECT = 1.2
MAX_ASPECT = 2.5

def detect_cards(img: np.ndarray) -> list[Card]:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Edge detection to find card borders
    edges = cv2.Canny(gray, 30, 100)
    
    # Dilate to connect broken edges
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges = cv2.dilate(edges, kernel, iterations=2)
    
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    cards = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w < MIN_CARD_W or h < MIN_CARD_H:
            continue
        aspect = w / h
        if aspect < MIN_ASPECT or aspect > MAX_ASPECT:
            continue
        cards.append(Card(x=x, y=y, w=w, h=h))
    
    # Remove overlapping detections (keep largest)
    cards = _remove_overlaps(cards)
    
    # Sort: top-to-bottom, left-to-right (group by row using y-tolerance)
    if cards:
        avg_h = sum(c.h for c in cards) / len(cards)
        row_tol = avg_h * 0.3
        cards.sort(key=lambda c: (round(c.y / row_tol), c.x))
    
    return cards

def _remove_overlaps(cards: list[Card]) -> list[Card]:
    if not cards:
        return cards
    cards.sort(key=lambda c: c.w * c.h, reverse=True)
    kept = []
    for card in cards:
        overlaps = False
        for k in kept:
            if _iou(card, k) > 0.3:
                overlaps = True
                break
        if not overlaps:
            kept.append(card)
    return kept

def _iou(a: Card, b: Card) -> float:
    x1 = max(a.x, b.x)
    y1 = max(a.y, b.y)
    x2 = min(a.x + a.w, b.x + b.w)
    y2 = min(a.y + a.h, b.y + b.h)
    if x2 <= x1 or y2 <= y1:
        return 0.0
    inter = (x2 - x1) * (y2 - y1)
    union = a.w * a.h + b.w * b.h - inter
    return inter / union if union > 0 else 0.0

def crop_region(card_img: np.ndarray, region_key: str) -> np.ndarray:
    r = LAYOUT[region_key]
    h, w = card_img.shape[:2]
    x1 = int(r["x"] * w)
    y1 = int(r["y"] * h)
    x2 = int((r["x"] + r["w"]) * w)
    y2 = int((r["y"] + r["h"]) * h)
    return card_img[y1:y2, x1:x2]
```

- [ ] **Step 4: Run tests**

```bash
cd sidecar && python3 -m pytest test_detect_cards.py -v
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add sidecar/detect_cards.py sidecar/test_detect_cards.py
git commit -m "feat: card detection — find tribesman card boundaries via contour detection"
```

---

## Task 5: Text OCR

Extracts name, level, class, clan, and title from cropped card text regions.

**Files:**
- Create: `sidecar/ocr_text.py`
- Test: `sidecar/test_ocr_text.py`

- [ ] **Step 1: Write the test**

```python
# sidecar/test_ocr_text.py
from ocr_text import parse_level_line, parse_name, CardText

def test_parse_level_line_full():
    result = parse_level_line("LV.50 Master Hunter <Claw Tribe>")
    assert result["level"] == 50
    assert result["class_name"] == "Master Hunter"
    assert result["clan"] == "Claw Tribe"

def test_parse_level_line_no_clan():
    result = parse_level_line("LV.30 Skilled Laborer")
    assert result["level"] == 30
    assert result["class_name"] == "Skilled Laborer"
    assert result["clan"] is None

def test_parse_level_line_with_angle_brackets():
    result = parse_level_line("LV.50 Master Hunter <Wolf Tribe>")
    assert result["clan"] == "Wolf Tribe"

def test_parse_level_line_lv_variations():
    for text in ["Lv.50 Hunter", "LV50 Hunter", "Lv 50 Hunter", "LV. 50 Hunter"]:
        result = parse_level_line(text)
        assert result["level"] == 50

def test_parse_name_strips_whitespace():
    assert parse_name("  Animals ONLY  ") == "Animals ONLY"

def test_parse_name_empty():
    assert parse_name("") == ""
    assert parse_name("   ") == ""
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd sidecar && python3 -m pytest test_ocr_text.py -v
```

Expected: `ModuleNotFoundError: No module named 'ocr_text'`

- [ ] **Step 3: Implement ocr_text.py**

```python
# sidecar/ocr_text.py
"""Stage 2: OCR text extraction from cropped card regions."""
import re
import cv2
import numpy as np
import pytesseract
from dataclasses import dataclass

@dataclass
class CardText:
    name: str
    level: int | None
    class_name: str | None
    clan: str | None
    title: str | None
    location: str | None

def preprocess_for_ocr(img: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    # Upscale small regions for better OCR
    h, w = gray.shape
    if w < 200:
        scale = 200 / w
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    # Binarize: white text on dark background → invert
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    # If mostly white pixels, the text is dark-on-light; otherwise invert
    if np.mean(binary) > 127:
        binary = cv2.bitwise_not(binary)
    return binary

def ocr_region(img: np.ndarray, psm: int = 7) -> str:
    processed = preprocess_for_ocr(img)
    config = f"--psm {psm} --oem 3"
    text = pytesseract.image_to_string(processed, config=config)
    return text.strip()

def parse_name(text: str) -> str:
    return text.strip()

def parse_level_line(text: str) -> dict:
    result = {"level": None, "class_name": None, "clan": None}
    
    # Extract clan from <brackets> or angle brackets
    clan_match = re.search(r'[<＜]([^>＞]+)[>＞]', text)
    if clan_match:
        result["clan"] = clan_match.group(1).strip()
        text = text[:clan_match.start()] + text[clan_match.end():]
    
    # Extract level: LV.50, Lv50, LV 50, etc.
    level_match = re.search(r'[Ll][Vv]\.?\s*(\d+)', text)
    if level_match:
        result["level"] = int(level_match.group(1))
        text = text[:level_match.start()] + text[level_match.end():]
    
    # Remaining text is the class name
    class_name = text.strip().strip(".")
    if class_name:
        result["class_name"] = class_name
    
    return result

def extract_card_text(card_img: np.ndarray, regions: dict) -> CardText:
    from detect_cards import crop_region
    
    name_img = crop_region(card_img, "name")
    name = parse_name(ocr_region(name_img, psm=7))
    
    level_img = crop_region(card_img, "level_line")
    level_data = parse_level_line(ocr_region(level_img, psm=7))
    
    title_img = crop_region(card_img, "title")
    title_raw = ocr_region(title_img, psm=7)
    title = title_raw if title_raw else None
    
    return CardText(
        name=name,
        level=level_data["level"],
        class_name=level_data["class_name"],
        clan=level_data["clan"],
        title=title,
        location=None,
    )
```

- [ ] **Step 4: Run tests**

```bash
cd sidecar && python3 -m pytest test_ocr_text.py -v
```

Expected: 6 tests pass. (The regex-only tests don't need Tesseract.)

- [ ] **Step 5: Commit**

```bash
git add sidecar/ocr_text.py sidecar/test_ocr_text.py
git commit -m "feat: text OCR — extract name/level/class/clan/title from card regions"
```

---

## Task 6: Trait icon matching

Template-matches extracted icons against the reference atlas.

**Files:**
- Create: `sidecar/match_traits.py`
- Test: `sidecar/test_match_traits.py`

- [ ] **Step 1: Write the test**

```python
# sidecar/test_match_traits.py
import os, tempfile, numpy as np, cv2, pytest
from PIL import Image
from match_traits import load_atlas, match_icon, segment_icons, TraitMatch

ATLAS_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "atlas")

@pytest.fixture
def atlas():
    if not os.path.exists(ATLAS_DIR) or not os.listdir(ATLAS_DIR):
        pytest.skip("Atlas not generated — run gen_atlas.py first")
    return load_atlas(ATLAS_DIR)

def test_load_atlas(atlas):
    assert len(atlas) > 300
    for name, img in atlas.items():
        assert img.shape[0] == img.shape[1]  # square

def test_match_icon_exact(atlas):
    """Matching an atlas image against itself should return confidence ~1.0."""
    name = list(atlas.keys())[0]
    template = atlas[name]
    result = match_icon(template, atlas)
    assert result.icon_name == name
    assert result.confidence > 0.99

def test_match_icon_with_noise(atlas):
    """Adding noise should still match above threshold."""
    name = list(atlas.keys())[0]
    template = atlas[name].copy()
    noise = np.random.randint(0, 30, template.shape, dtype=np.uint8)
    noisy = cv2.add(template, noise)
    result = match_icon(noisy, atlas)
    assert result.icon_name == name
    assert result.confidence > 0.7

def test_segment_icons_row():
    """A row of evenly-spaced colored squares should segment correctly."""
    row = np.zeros((40, 200, 3), dtype=np.uint8)
    for i in range(5):
        x = 5 + i * 38
        cv2.rectangle(row, (x, 4), (x + 30, 34), (100, 150, 100), -1)
    icons = segment_icons(row, expected_size=30)
    assert len(icons) >= 4  # allow some margin
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd sidecar && python3 -m pytest test_match_traits.py -v
```

Expected: `ModuleNotFoundError: No module named 'match_traits'`

- [ ] **Step 3: Implement match_traits.py**

```python
# sidecar/match_traits.py
"""Stage 3-4: Extract trait icons from card row and match against reference atlas."""
import os, cv2
import numpy as np
from dataclasses import dataclass

@dataclass
class TraitMatch:
    icon_name: str
    confidence: float
    bbox: tuple[int, int, int, int]  # x, y, w, h within the icon row

CONFIDENCE_THRESHOLD = 0.65

def load_atlas(atlas_dir: str, size: int | None = None) -> dict[str, np.ndarray]:
    atlas = {}
    for fname in os.listdir(atlas_dir):
        if not fname.endswith(".png"):
            continue
        name = os.path.splitext(fname)[0]
        img = cv2.imread(os.path.join(atlas_dir, fname), cv2.IMREAD_COLOR)
        if img is None:
            continue
        if size and (img.shape[0] != size or img.shape[1] != size):
            img = cv2.resize(img, (size, size))
        atlas[name] = img
    return atlas

def segment_icons(trait_row: np.ndarray, expected_size: int = 32) -> list[tuple[np.ndarray, int, int]]:
    """Segment individual icons from the trait icon row.
    Returns list of (icon_image, x_offset, y_offset)."""
    gray = cv2.cvtColor(trait_row, cv2.COLOR_BGR2GRAY) if len(trait_row.shape) == 3 else trait_row
    _, binary = cv2.threshold(gray, 25, 255, cv2.THRESH_BINARY)
    
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    icons = []
    min_size = expected_size * 0.5
    max_size = expected_size * 2.5
    
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w < min_size or h < min_size or w > max_size or h > max_size:
            continue
        # Enforce roughly square aspect
        aspect = max(w, h) / min(w, h) if min(w, h) > 0 else 99
        if aspect > 1.8:
            continue
        # Pad to square
        side = max(w, h)
        cx, cy = x + w // 2, y + h // 2
        x1 = max(0, cx - side // 2)
        y1 = max(0, cy - side // 2)
        x2 = min(trait_row.shape[1], x1 + side)
        y2 = min(trait_row.shape[0], y1 + side)
        icon_crop = trait_row[y1:y2, x1:x2]
        if icon_crop.size == 0:
            continue
        icons.append((icon_crop, x1, y1))
    
    # Sort left-to-right
    icons.sort(key=lambda t: t[1])
    return icons

def match_icon(icon_img: np.ndarray, atlas: dict[str, np.ndarray]) -> TraitMatch:
    """Match a single icon against the atlas. Returns best match."""
    best_name = ""
    best_score = -1.0
    
    target_size = next(iter(atlas.values())).shape[0]
    if icon_img.shape[0] != target_size or icon_img.shape[1] != target_size:
        icon_img = cv2.resize(icon_img, (target_size, target_size))
    
    for name, ref in atlas.items():
        result = cv2.matchTemplate(icon_img, ref, cv2.TM_CCOEFF_NORMED)
        score = float(result[0][0])
        if score > best_score:
            best_score = score
            best_name = name
    
    return TraitMatch(icon_name=best_name, confidence=best_score, bbox=(0, 0, 0, 0))

def match_trait_row(trait_row: np.ndarray, atlas: dict[str, np.ndarray],
                    expected_icon_size: int = 32) -> list[TraitMatch]:
    """Extract and match all icons in a trait row image."""
    icons = segment_icons(trait_row, expected_size=expected_icon_size)
    
    matches = []
    for icon_img, x, y in icons:
        m = match_icon(icon_img, atlas)
        m.bbox = (x, y, icon_img.shape[1], icon_img.shape[0])
        if m.confidence >= CONFIDENCE_THRESHOLD:
            matches.append(m)
    
    return matches
```

- [ ] **Step 4: Run tests**

```bash
cd sidecar && python3 -m pytest test_match_traits.py -v
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add sidecar/match_traits.py sidecar/test_match_traits.py
git commit -m "feat: trait icon matching — template match against reference atlas"
```

---

## Task 7: Process orchestrator

CLI entry point: takes an image path, chains detect → OCR → match, outputs JSON to stdout.

**Files:**
- Create: `sidecar/process.py`
- Test: `sidecar/test_process.py`

- [ ] **Step 1: Write the test**

```python
# sidecar/test_process.py
import json, subprocess, sys, os, pytest

SIDECAR_DIR = os.path.dirname(__file__)
ATLAS_DIR = os.path.join(SIDECAR_DIR, "..", "assets", "atlas")

def test_process_invalid_path():
    result = subprocess.run(
        [sys.executable, os.path.join(SIDECAR_DIR, "process.py"), "/nonexistent.png"],
        capture_output=True, text=True
    )
    assert result.returncode != 0
    output = json.loads(result.stdout)
    assert "error" in output

def test_process_output_schema():
    """Process a blank image — should return valid JSON with empty tribesmen array."""
    import tempfile, cv2, numpy as np
    img = np.zeros((600, 800, 3), dtype=np.uint8)
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        cv2.imwrite(f.name, img)
        tmp_path = f.name
    try:
        result = subprocess.run(
            [sys.executable, os.path.join(SIDECAR_DIR, "process.py"), tmp_path,
             "--atlas", ATLAS_DIR],
            capture_output=True, text=True
        )
        assert result.returncode == 0
        output = json.loads(result.stdout)
        assert "tribesmen" in output
        assert isinstance(output["tribesmen"], list)
    finally:
        os.unlink(tmp_path)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd sidecar && python3 -m pytest test_process.py -v
```

Expected: `ModuleNotFoundError` or file-not-found error.

- [ ] **Step 3: Implement process.py**

```python
#!/usr/bin/env python3
# sidecar/process.py
"""Main entry: image path → JSON stdout. Called by Tauri as a sidecar."""
import json, sys, os, argparse, traceback
import cv2

def process_image(image_path: str, atlas_dir: str) -> dict:
    from detect_cards import detect_cards, crop_region
    from ocr_text import extract_card_text
    from match_traits import load_atlas, match_trait_row

    img = cv2.imread(image_path)
    if img is None:
        return {"error": f"Cannot read image: {image_path}", "tribesmen": []}

    atlas = load_atlas(atlas_dir) if os.path.isdir(atlas_dir) else {}
    cards = detect_cards(img)

    tribesmen = []
    for i, card in enumerate(cards):
        card_img = card.crop(img)
        try:
            text = extract_card_text(card_img, {})
            trait_row = crop_region(card_img, "trait_row")
            matches = match_trait_row(trait_row, atlas) if atlas else []
            tribesmen.append({
                "name": text.name,
                "level": text.level,
                "class": text.class_name,
                "clan": text.clan,
                "title": text.title,
                "location": text.location,
                "traits": [
                    {"icon_name": m.icon_name, "confidence": round(m.confidence, 3)}
                    for m in matches
                ],
                "card_index": i,
            })
        except Exception as e:
            tribesmen.append({
                "name": f"[Card {i} error]",
                "error": str(e),
                "card_index": i,
                "traits": [],
            })

    return {"tribesmen": tribesmen, "cards_found": len(cards)}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("image", help="Path to screenshot image")
    parser.add_argument("--atlas", default=os.path.join(os.path.dirname(__file__), "..", "assets", "atlas"))
    args = parser.parse_args()

    if not os.path.exists(args.image):
        print(json.dumps({"error": f"File not found: {args.image}", "tribesmen": []}))
        sys.exit(1)

    try:
        result = process_image(args.image, args.atlas)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e), "traceback": traceback.format_exc(), "tribesmen": []}))
        sys.exit(1)

if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests**

```bash
cd sidecar && python3 -m pytest test_process.py -v
```

Expected: 2 tests pass.

- [ ] **Step 5: Manual smoke test with a real screenshot (when available)**

```bash
cd sidecar && python3 process.py ../test/fixtures/tribesman-list.png --atlas ../assets/atlas | python3 -m json.tool
```

Expected: JSON with tribesmen array. Review names/levels for OCR accuracy.

- [ ] **Step 6: Commit**

```bash
git add sidecar/process.py sidecar/test_process.py
git commit -m "feat: process orchestrator — image path to JSON pipeline"
```

---

## Task 8: TypeScript types + trait data

**Files:**
- Create: `src/lib/types.ts`, `src/lib/traits.ts`

- [ ] **Step 1: Create type definitions**

```ts
// src/lib/types.ts
export interface TraitMatch {
  icon_name: string
  confidence: number
}

export interface Tribesman {
  name: string
  level: number | null
  class: string | null
  clan: string | null
  title: string | null
  location: string | null
  traits: TraitMatch[]
  captured_at: string
}

export interface Roster {
  last_updated: string
  tribesmen: Tribesman[]
}

export interface ProcessResult {
  tribesmen: Tribesman[]
  cards_found: number
  error?: string
}

export interface TraitInfo {
  id: string
  star: number
  name_zh: string
  description_zh: string
  source: string
  icon_name: string
  is_negative: boolean
  clan: string | null
  effect_attr: string | null
  effect_value: number | null
  effect_is_percentage: boolean
}
```

- [ ] **Step 2: Create trait data loader**

```ts
// src/lib/traits.ts
import type { TraitInfo } from './types'
import traitsData from '../../assets/traits.json'

const traitsArray = traitsData as TraitInfo[]

// Index by icon_name for fast lookup during display
const byIconName = new Map<string, TraitInfo[]>()
for (const t of traitsArray) {
  if (!t.icon_name) continue
  const arr = byIconName.get(t.icon_name) || []
  arr.push(t)
  byIconName.set(t.icon_name, arr)
}

export function getTraitsByIconName(iconName: string): TraitInfo[] {
  return byIconName.get(iconName) || []
}

export function getBestTrait(iconName: string): TraitInfo | null {
  const traits = getTraitsByIconName(iconName)
  if (!traits.length) return null
  // Return highest star version
  return traits.reduce((a, b) => (b.star > a.star ? b : a))
}

export { traitsArray }
```

- [ ] **Step 3: Copy traits.json to assets/**

```bash
cp Game/Parsed/traits.json assets/traits.json
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/traits.ts assets/traits.json
git commit -m "feat: TypeScript types and trait data loader"
```

---

## Task 9: Zustand store

**Files:**
- Create: `src/lib/store.ts`

- [ ] **Step 1: Create the store**

```ts
// src/lib/store.ts
import { create } from 'zustand'
import type { Tribesman, Roster, ProcessResult } from './types'

interface RosterState {
  tribesmen: Tribesman[]
  lastUpdated: string | null
  isProcessing: boolean
  lastResult: ProcessResult | null

  addProcessResult: (result: ProcessResult) => void
  updateTribesman: (name: string, updates: Partial<Tribesman>) => void
  removeTribesman: (name: string) => void
  clearRoster: () => void
  loadRoster: (roster: Roster) => void
}

function mergeResults(existing: Tribesman[], incoming: Tribesman[]): Tribesman[] {
  const byName = new Map(existing.map(t => [t.name, t]))
  for (const t of incoming) {
    if (!t.name || t.name.startsWith('[Card')) continue
    byName.set(t.name, { ...t, captured_at: new Date().toISOString() })
  }
  return Array.from(byName.values())
}

export const useRosterStore = create<RosterState>((set) => ({
  tribesmen: [],
  lastUpdated: null,
  isProcessing: false,
  lastResult: null,

  addProcessResult: (result) => set((state) => ({
    tribesmen: mergeResults(state.tribesmen, result.tribesmen),
    lastUpdated: new Date().toISOString(),
    lastResult: result,
    isProcessing: false,
  })),

  updateTribesman: (name, updates) => set((state) => ({
    tribesmen: state.tribesmen.map(t =>
      t.name === name ? { ...t, ...updates } : t
    ),
  })),

  removeTribesman: (name) => set((state) => ({
    tribesmen: state.tribesmen.filter(t => t.name !== name),
  })),

  clearRoster: () => set({ tribesmen: [], lastUpdated: null, lastResult: null }),

  loadRoster: (roster) => set({
    tribesmen: roster.tribesmen,
    lastUpdated: roster.last_updated,
  }),
}))
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/store.ts
git commit -m "feat: Zustand roster store with merge strategy"
```

---

## Task 10: Rust sidecar IPC commands

**Files:**
- Modify: `src-tauri/src/main.rs`
- Create: `src-tauri/src/commands.rs`

- [ ] **Step 1: Create commands.rs**

```rust
// src-tauri/src/commands.rs
use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::AppHandle;

#[derive(Debug, Serialize, Deserialize)]
pub struct TraitMatch {
    pub icon_name: String,
    pub confidence: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Tribesman {
    pub name: String,
    pub level: Option<i32>,
    pub class: Option<String>,
    pub clan: Option<String>,
    pub title: Option<String>,
    pub location: Option<String>,
    pub traits: Vec<TraitMatch>,
    #[serde(default)]
    pub captured_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessResult {
    pub tribesmen: Vec<Tribesman>,
    pub cards_found: usize,
    #[serde(default)]
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Roster {
    pub last_updated: String,
    pub tribesmen: Vec<Tribesman>,
}

#[tauri::command]
pub async fn process_images(paths: Vec<String>, app: AppHandle) -> Result<ProcessResult, String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?;
    let atlas_dir = resource_dir.join("assets").join("atlas");
    let sidecar_dir = resource_dir.join("sidecar");
    let process_py = sidecar_dir.join("process.py");

    let mut all_tribesmen = Vec::new();
    let mut total_cards = 0;

    for path in &paths {
        let output = Command::new("python3")
            .arg(&process_py)
            .arg(path)
            .arg("--atlas")
            .arg(&atlas_dir)
            .output()
            .map_err(|e| format!("Failed to run sidecar: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            // Try to parse error from stdout (sidecar writes JSON even on error)
            if let Ok(result) = serde_json::from_str::<ProcessResult>(&stdout) {
                if let Some(err) = result.error {
                    return Err(err);
                }
            }
            return Err(format!("Sidecar failed: {}", stderr));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let result: ProcessResult =
            serde_json::from_str(&stdout).map_err(|e| format!("Invalid JSON from sidecar: {}", e))?;

        total_cards += result.cards_found;
        all_tribesmen.extend(result.tribesmen);
    }

    Ok(ProcessResult {
        tribesmen: all_tribesmen,
        cards_found: total_cards,
        error: None,
    })
}

#[tauri::command]
pub async fn save_roster(roster: Roster, app: AppHandle) -> Result<(), String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let path = data_dir.join("roster.json");
    let json = serde_json::to_string_pretty(&roster).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn load_roster(app: AppHandle) -> Result<Option<Roster>, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let path = data_dir.join("roster.json");
    if !path.exists() {
        return Ok(None);
    }
    let json = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let roster: Roster = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    Ok(Some(roster))
}
```

- [ ] **Step 2: Update main.rs to register commands**

```rust
// src-tauri/src/main.rs
mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::process_images,
            commands::save_roster,
            commands::load_roster,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 3: Add tauri path API dependency**

Add `use tauri::Manager;` at the top of `commands.rs` — needed for `app.path()`.

- [ ] **Step 4: Verify it compiles**

```bash
cd src-tauri && cargo build
```

Expected: Builds without errors.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands.rs src-tauri/src/main.rs
git commit -m "feat: Rust sidecar IPC — process_images, save/load roster commands"
```

---

## Task 11: Trait icon component

**Files:**
- Create: `src/components/TraitIcon.tsx`

- [ ] **Step 1: Create TraitIcon component**

Reuses the badge rendering pattern from the Codex frontend.

```tsx
// src/components/TraitIcon.tsx
import { useState } from 'react'
import { getBestTrait } from '../lib/traits'

const BADGE_PATHS = {
  hexagon: 'M27,5 L73,5 L96,50 L73,95 L27,95 L4,50 Z',
  diamond: 'M50,4 L96,50 L50,96 L4,50 Z',
  shield: 'M50,6 L86,22 L86,54 Q86,82 50,95 Q14,82 14,54 L14,22 Z',
}

const BADGE_INNER = {
  hexagon: 'M30,10 L70,10 L90,50 L70,90 L30,90 L10,50 Z',
  diamond: 'M50,10 L90,50 L50,90 L10,50 Z',
  shield: 'M50,11 L81,25 L81,52 Q81,78 50,90 Q19,78 19,52 L19,25 Z',
}

type BadgeShape = 'hexagon' | 'diamond' | 'shield'

function getShape(source: string | undefined): BadgeShape {
  if (source === 'Normal' || !source) return 'hexagon'
  if (source === 'XiHao' || source === 'XingGe') return 'diamond'
  return 'shield'
}

const BADGE_COLORS: Record<BadgeShape, { fill: string; stroke: string }> = {
  hexagon: { fill: '#1e2a1a', stroke: '#4a6a3a' },
  diamond: { fill: '#2e2640', stroke: '#8a70b0' },
  shield:  { fill: '#2a2518', stroke: '#8a7a4a' },
}

interface Props {
  iconName: string
  confidence?: number
  size?: number
  showTooltip?: boolean
}

export function TraitIcon({ iconName, confidence, size = 28, showTooltip = true }: Props) {
  const [hover, setHover] = useState(false)
  const [imgErr, setImgErr] = useState(false)
  const trait = getBestTrait(iconName)
  const shape = getShape(trait?.source)
  const colors = BADGE_COLORS[shape]
  const iconSize = Math.ceil(size * 0.65)
  const isLowConf = confidence !== undefined && confidence < 0.8

  return (
    <div
      className="relative inline-flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0" style={{ width: size, height: size }}>
        <path d={BADGE_PATHS[shape]} fill={colors.stroke} />
        <path d={BADGE_INNER[shape]} fill={colors.fill} />
      </svg>
      {!imgErr && (
        <img
          src={`/icons/${iconName}.webp`}
          alt={trait?.name_zh || iconName}
          className="relative object-contain"
          style={{ width: iconSize, height: iconSize }}
          onError={() => setImgErr(true)}
        />
      )}
      {isLowConf && (
        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-danger rounded-full" />
      )}

      {hover && showTooltip && trait && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-panel border border-green/20 rounded text-xs whitespace-nowrap shadow-lg">
          <div className="font-medium text-text">{trait.name_zh}</div>
          {trait.description_zh && (
            <div className="text-text-dim mt-0.5 max-w-[200px] whitespace-normal">
              {trait.description_zh}
            </div>
          )}
          {confidence !== undefined && (
            <div className={`mt-1 ${isLowConf ? 'text-danger' : 'text-text-dim'}`}>
              Confidence: {Math.round(confidence * 100)}%
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TraitIcon.tsx
git commit -m "feat: TraitIcon component with badge shapes and tooltip"
```

---

## Task 12: Roster table page

**Files:**
- Create: `src/pages/Roster.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create Roster page**

```tsx
// src/pages/Roster.tsx
import { useState, useMemo } from 'react'
import { useRosterStore } from '../lib/store'
import { TraitIcon } from '../components/TraitIcon'

type SortKey = 'name' | 'level' | 'class' | 'clan' | 'title'
type SortDir = 'asc' | 'desc'

export function Roster() {
  const { tribesmen } = useRosterStore()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let list = tribesmen
    if (q) {
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.clan?.toLowerCase().includes(q)) ||
        (t.title?.toLowerCase().includes(q)) ||
        (t.class?.toLowerCase().includes(q))
      )
    }
    list = [...list].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      const cmp = String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [tribesmen, search, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="Filter by name, clan, title..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-tile border border-green/20 rounded px-3 py-1.5 text-sm text-text placeholder-text-dim focus:outline-none focus:border-green/50 w-64"
        />
        <span className="text-text-dim text-sm">
          {filtered.length} tribesman{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-text-dim py-16">
          {tribesmen.length === 0
            ? 'No tribesmen yet. Import a screenshot to get started.'
            : 'No matches for your filter.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-green/20 text-left">
                {(['name', 'level', 'class', 'clan', 'title'] as SortKey[]).map(key => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    className="px-3 py-2 font-medium text-text-dim cursor-pointer hover:text-text select-none capitalize"
                  >
                    {key}{sortIndicator(key)}
                  </th>
                ))}
                <th className="px-3 py-2 font-medium text-text-dim">Traits</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={t.name + i} className="border-b border-green/10 hover:bg-tile/50">
                  <td className="px-3 py-2 font-medium">{t.name}</td>
                  <td className="px-3 py-2">{t.level ?? '—'}</td>
                  <td className="px-3 py-2">{t.class ?? '—'}</td>
                  <td className="px-3 py-2">{t.clan ?? '—'}</td>
                  <td className="px-3 py-2">{t.title ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 flex-wrap">
                      {t.traits.map((tr, j) => (
                        <TraitIcon
                          key={j}
                          iconName={tr.icon_name}
                          confidence={tr.confidence}
                          size={24}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update App.tsx with layout and roster**

```tsx
// src/App.tsx
import { useEffect } from 'react'
import { Roster } from './pages/Roster'
import { useRosterStore } from './lib/store'
import { invoke } from '@tauri-apps/api/core'
import './styles.css'

function App() {
  const { loadRoster } = useRosterStore()

  useEffect(() => {
    invoke<{ last_updated: string; tribesmen: any[] } | null>('load_roster')
      .then(roster => { if (roster) loadRoster(roster) })
      .catch(console.error)
  }, [loadRoster])

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-green/20 px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-green">Screenread</h1>
        <span className="text-text-dim text-sm">Tribesman roster scanner</span>
      </header>
      <div className="p-6">
        {/* CapturePanel added in Task 13 */}
        <Roster />
      </div>
    </div>
  )
}

export default App
```

Note: `CapturePanel` is created in Task 13 and added to `App.tsx` at that point. After Task 13, update the `App.tsx` import to include it:

```tsx
import { CapturePanel } from './components/CapturePanel'
// ... and render <CapturePanel /> above <Roster />
```

- [ ] **Step 3: Verify typecheck**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Roster.tsx src/App.tsx
git commit -m "feat: roster table page with sort, filter, trait icons"
```

---

## Task 13: Capture panel

**Files:**
- Create: `src/components/CapturePanel.tsx`

- [ ] **Step 1: Create CapturePanel component**

```tsx
// src/components/CapturePanel.tsx
import { useState, useCallback } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import { useRosterStore } from '../lib/store'
import type { ProcessResult } from '../lib/types'

export function CapturePanel() {
  const [files, setFiles] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<ProcessResult | null>(null)
  const { addProcessResult } = useRosterStore()

  const handleImport = useCallback(async () => {
    const selected = await open({
      multiple: true,
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'bmp'] }],
    })
    if (selected) {
      const paths = Array.isArray(selected) ? selected.map(f => typeof f === 'string' ? f : f.path) : [typeof selected === 'string' ? selected : selected.path]
      setFiles(paths)
    }
  }, [])

  const handleProcess = useCallback(async () => {
    if (!files.length) return
    setProcessing(true)
    setResult(null)
    try {
      const res = await invoke<ProcessResult>('process_images', { paths: files })
      setResult(res)
      addProcessResult(res)
    } catch (e) {
      setResult({ tribesmen: [], cards_found: 0, error: String(e) })
    } finally {
      setProcessing(false)
    }
  }, [files, addProcessResult])

  const lowConf = result?.tribesmen.filter(t =>
    t.traits.some(tr => tr.confidence < 0.8)
  ).length ?? 0

  return (
    <div className="mb-6 p-4 bg-panel rounded-lg border border-green/20">
      <div className="flex items-center gap-3">
        <button
          onClick={handleImport}
          className="px-4 py-2 bg-tile hover:bg-green/20 border border-green/30 rounded text-sm text-text transition-colors"
        >
          Import screenshots
        </button>
        {files.length > 0 && (
          <>
            <span className="text-text-dim text-sm">
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleProcess}
              disabled={processing}
              className="px-4 py-2 bg-green/20 hover:bg-green/30 border border-green/40 rounded text-sm text-green font-medium transition-colors disabled:opacity-50"
            >
              {processing ? 'Processing...' : 'Process'}
            </button>
          </>
        )}
      </div>

      {processing && (
        <div className="mt-3 text-text-dim text-sm flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-green/40 border-t-green rounded-full animate-spin" />
          Analyzing screenshots...
        </div>
      )}

      {result && !processing && (
        <div className="mt-3 text-sm">
          {result.error ? (
            <div className="text-danger">{result.error}</div>
          ) : (
            <div className="text-text-dim">
              Found {result.cards_found} cards, {result.tribesmen.length} tribesmen parsed.
              {lowConf > 0 && (
                <span className="text-gold ml-2">
                  {lowConf} with low-confidence matches — review recommended.
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CapturePanel.tsx
git commit -m "feat: capture panel — import images, trigger processing, show results"
```

---

## Task 14: Review/correction UI

**Files:**
- Create: `src/components/ReviewRow.tsx`
- Modify: `src/pages/Roster.tsx`

- [ ] **Step 1: Create ReviewRow component**

```tsx
// src/components/ReviewRow.tsx
import { useState } from 'react'
import { TraitIcon } from './TraitIcon'
import { traitsArray } from '../lib/traits'
import { useRosterStore } from '../lib/store'
import type { TraitMatch } from '../lib/types'

interface Props {
  tribesmen: { name: string; traits: TraitMatch[] }[]
}

export function ReviewPanel({ tribesmen }: Props) {
  const lowConf = tribesmen.filter(t =>
    t.traits.some(tr => tr.confidence < 0.8)
  )
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const { updateTribesman } = useRosterStore()

  if (lowConf.length === 0) return null

  const visible = lowConf.filter(t => !dismissed.has(t.name))
  if (visible.length === 0) return null

  return (
    <div className="mb-6 p-4 bg-panel rounded-lg border border-gold/30">
      <h3 className="text-gold font-medium text-sm mb-3">
        Review needed — {visible.length} tribesman{visible.length !== 1 ? 's' : ''} with uncertain matches
      </h3>
      <div className="space-y-3">
        {visible.map(t => (
          <ReviewItem
            key={t.name}
            name={t.name}
            traits={t.traits}
            onDismiss={() => setDismissed(s => new Set(s).add(t.name))}
            onUpdate={(traits) => updateTribesman(t.name, { traits })}
          />
        ))}
      </div>
    </div>
  )
}

function ReviewItem({ name, traits, onDismiss, onUpdate }: {
  name: string
  traits: TraitMatch[]
  onDismiss: () => void
  onUpdate: (traits: TraitMatch[]) => void
}) {
  const [editing, setEditing] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const flagged = traits
    .map((tr, i) => ({ ...tr, index: i }))
    .filter(tr => tr.confidence < 0.8)

  function replaceTrait(index: number, newIconName: string) {
    const updated = [...traits]
    updated[index] = { icon_name: newIconName, confidence: 1.0 }
    onUpdate(updated)
    setEditing(null)
    setSearch('')
  }

  const filteredTraits = search
    ? traitsArray.filter(t =>
        t.icon_name.includes(search.toLowerCase()) ||
        t.name_zh.includes(search)
      ).slice(0, 10)
    : []

  return (
    <div className="flex items-start gap-3 p-2 bg-tile/50 rounded">
      <span className="text-text font-medium text-sm min-w-[120px]">{name}</span>
      <div className="flex gap-2 flex-wrap items-start">
        {flagged.map(tr => (
          <div key={tr.index} className="relative">
            <button
              onClick={() => setEditing(editing === tr.index ? null : tr.index)}
              className="border border-danger/40 rounded p-0.5"
            >
              <TraitIcon iconName={tr.icon_name} confidence={tr.confidence} size={28} showTooltip={false} />
            </button>
            <span className="text-danger text-[10px] block text-center">
              {Math.round(tr.confidence * 100)}%
            </span>
            {editing === tr.index && (
              <div className="absolute z-50 top-full left-0 mt-1 bg-panel border border-green/20 rounded shadow-lg p-2 w-56">
                <input
                  type="text"
                  placeholder="Search trait..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-tile border border-green/20 rounded px-2 py-1 text-xs text-text mb-1"
                  autoFocus
                />
                <div className="max-h-32 overflow-y-auto">
                  {filteredTraits.map(t => (
                    <button
                      key={t.id}
                      onClick={() => replaceTrait(tr.index, t.icon_name)}
                      className="flex items-center gap-2 w-full px-1 py-0.5 hover:bg-tile rounded text-xs text-left"
                    >
                      <TraitIcon iconName={t.icon_name} size={20} showTooltip={false} />
                      <span>{t.name_zh}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={onDismiss}
        className="ml-auto text-text-dim hover:text-text text-xs"
      >
        Dismiss
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Add ReviewPanel to Roster page**

In `src/pages/Roster.tsx`, add the import at the top and render before the table:

```tsx
import { ReviewPanel } from '../components/ReviewRow'

// Inside the Roster component, before the table:
<ReviewPanel tribesmen={tribesmen} />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ReviewRow.tsx src/pages/Roster.tsx
git commit -m "feat: review panel — flag and correct low-confidence trait matches"
```

---

## Task 15: Persistence

Save roster to disk on every change, load on startup.

**Files:**
- Modify: `src/lib/store.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add auto-save to store**

In `src/lib/store.ts`, update `addProcessResult`, `updateTribesman`, `removeTribesman`, and `clearRoster` to call save after each mutation:

```ts
import { invoke } from '@tauri-apps/api/core'

function saveToBackend(state: RosterState) {
  invoke('save_roster', {
    roster: {
      last_updated: state.lastUpdated || new Date().toISOString(),
      tribesmen: state.tribesmen,
    },
  }).catch(console.error)
}

// Wrap set calls with auto-save using zustand's subscribe:
// After the store creation, add:
useRosterStore.subscribe((state) => {
  if (state.tribesmen.length > 0 || state.lastUpdated) {
    saveToBackend(state)
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/store.ts src/App.tsx
git commit -m "feat: auto-persist roster to local JSON via Tauri"
```

---

## Task 16: Screen capture (Windows)

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/capture.rs`
- Modify: `src-tauri/src/commands.rs`
- Modify: `src/components/CapturePanel.tsx`

- [ ] **Step 1: Add xcap dependency**

In `src-tauri/Cargo.toml`:

```toml
[target.'cfg(windows)'.dependencies]
xcap = "0.1"
```

- [ ] **Step 2: Create capture.rs**

```rust
// src-tauri/src/capture.rs
use std::path::PathBuf;

#[cfg(windows)]
pub fn capture_screen(output_path: PathBuf) -> Result<PathBuf, String> {
    use xcap::Monitor;
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    let monitor = monitors.into_iter().next().ok_or("No monitor found")?;
    let image = monitor.capture_image().map_err(|e| e.to_string())?;
    image.save(&output_path).map_err(|e| e.to_string())?;
    Ok(output_path)
}

#[cfg(not(windows))]
pub fn capture_screen(_output_path: PathBuf) -> Result<PathBuf, String> {
    Err("Screen capture is only available on Windows".to_string())
}
```

- [ ] **Step 3: Add capture command to commands.rs**

```rust
#[tauri::command]
pub async fn capture_screen_cmd(app: AppHandle) -> Result<String, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let path = data_dir.join(format!("capture_{}.png", timestamp));
    let result = crate::capture::capture_screen(path)?;
    Ok(result.to_string_lossy().to_string())
}
```

Register in `main.rs`: add `commands::capture_screen_cmd` to `generate_handler!`.

- [ ] **Step 4: Add capture button to CapturePanel (Windows only)**

In `CapturePanel.tsx`, add a "Capture screen" button alongside "Import screenshots":

```tsx
const handleCapture = useCallback(async () => {
  setProcessing(true)
  try {
    const path = await invoke<string>('capture_screen_cmd')
    setFiles([path])
    const res = await invoke<ProcessResult>('process_images', { paths: [path] })
    setResult(res)
    addProcessResult(res)
  } catch (e) {
    setResult({ tribesmen: [], cards_found: 0, error: String(e) })
  } finally {
    setProcessing(false)
  }
}, [addProcessResult])
```

```tsx
<button
  onClick={handleCapture}
  className="px-4 py-2 bg-green/20 hover:bg-green/30 border border-green/40 rounded text-sm text-green font-medium transition-colors"
>
  Capture screen
</button>
```

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/capture.rs src-tauri/Cargo.toml src-tauri/src/commands.rs src-tauri/src/main.rs src/components/CapturePanel.tsx
git commit -m "feat: screen capture — Windows-only via xcap crate"
```

---

## Verification

### Automated tests

```bash
cd sidecar && python3 -m pytest -v           # Python sidecar tests
pnpm tsc --noEmit                            # TypeScript typecheck
cd src-tauri && cargo build                  # Rust compiles
```

### Manual testing on Mac

1. Generate the atlas: `cd sidecar && python3 gen_atlas.py`
2. Start the app: `pnpm tauri dev`
3. Click "Import screenshots" → select a game screenshot from `test/fixtures/`
4. Click "Process" → verify cards are found, names parsed, trait icons matched
5. Verify roster table shows sorted, filterable data
6. Hover trait icons → tooltip shows name + description + confidence
7. Low-confidence matches flagged with red dot → review panel appears
8. Close and reopen app → roster persists

### Manual testing on Windows

1. Run with game open: `pnpm tauri dev`
2. Click "Capture screen" → verifies game window capture
3. Process the capture → compare recognized names/traits against in-game data
4. Scroll in-game, capture again → verify merge (no duplicates)

### Fixture needed

To tune card detection thresholds and OCR region offsets, place a real game screenshot at `test/fixtures/tribesman-list.png`. The current `LAYOUT` constants in `detect_cards.py` are estimates that will need adjustment against real data.
