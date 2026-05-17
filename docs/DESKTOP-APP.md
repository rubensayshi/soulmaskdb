# Screenread — desktop app

Desktop app (Tauri 2) that reads Soulmask game screenshots and extracts tribesman roster data via OCR. Detects card boundaries in the game's 2-column UI grid, reads name/level/class/clan/status via Tesseract, matches trait icons against an atlas, and merges overlapping tribesmen across multiple screenshots.

## Architecture

```
Screenshot(s)  -->  Python sidecar (OpenCV + Tesseract)  -->  JSON
                         |
                         |-- detect_cards.py   -- morphological line detection -> card boundaries
                         |-- ocr_text.py       -- dual-channel OCR (grayscale + R channel)
                         |-- match_traits.py   -- template matching against trait icon atlas
                         |-- merge.py          -- cross-screenshot dedup via edit distance
                         \-- process.py        -- CLI entry point, orchestrates pipeline
```

The Tauri shell calls the sidecar, receives JSON, and renders a sortable roster table in React.

## Prerequisites

- **Node.js** (20+) and **pnpm**
- **Rust** (stable, via rustup)
- **Python 3.10+**
- **Tesseract OCR** — `brew install tesseract` (macOS) or `apt install tesseract-ocr` (Linux)

## Setup

```bash
# Frontend dependencies
pnpm install

# Python sidecar venv
cd sidecar
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

## Development

```bash
pnpm tauri dev
```

Starts Vite on `:1420` with HMR and the Tauri window. The Python sidecar is invoked on demand via Tauri's shell plugin.

Type-check the frontend without a full build:

```bash
pnpm typecheck
```

## Running the sidecar standalone

Process screenshots directly without the Tauri app:

```bash
cd sidecar
source .venv/bin/activate

# Single screenshot
python3 process.py /path/to/screenshot.png

# Multiple screenshots (merges overlapping tribesmen)
python3 process.py screenshot1.png screenshot2.png

# Custom trait atlas directory
python3 process.py --atlas ../assets/atlas screenshot.png
```

Output is JSON to stdout:

```json
{
  "tribesmen": [
    {
      "name": "Expedition VII",
      "level": 45,
      "class": "Skilled Guard",
      "clan": "Flint",
      "status": "Idle",
      "group": "Defenders",
      "traits": [
        { "icon_name": "trait_strong", "confidence": 0.92 }
      ]
    }
  ],
  "cards_found": 12,
  "images_processed": 2,
  "unique_tribesmen": 10
}
```

## Build

```bash
pnpm tauri build
```

Produces a native app bundle in `src-tauri/target/release/bundle/`. The sidecar and trait atlas are bundled as resources.

## Project structure

| Path             | What                                             |
| ---------------- | ------------------------------------------------ |
| `src/`           | React + TypeScript frontend (Vite, Tailwind 4)   |
| `src-tauri/`     | Rust backend (Tauri 2 commands, sidecar IPC)     |
| `sidecar/`       | Python OCR pipeline (OpenCV, Tesseract, numpy)   |
| `assets/atlas/`  | Pre-generated trait icon atlas for template match |
| `fixtures/`      | Test screenshots for tuning OCR parameters       |

## Python sidecar pipeline

| File              | Stage | What it does                                                 |
| ----------------- | ----- | ------------------------------------------------------------ |
| `detect_cards.py` | 1     | Finds card boundaries via horizontal separator lines         |
| `ocr_text.py`     | 2     | Extracts name, level, class, clan, status, group from cards  |
| `match_traits.py` | 3     | Matches trait row icons against the atlas via template match  |
| `merge.py`        | 4     | Deduplicates tribesmen across screenshots by name similarity |
| `process.py`      | --    | CLI entry point, orchestrates stages 1-4                     |
| `gen_atlas.py`    | --    | Generates the trait icon atlas from raw modkit icons          |

### OCR approach

The game renders light text on semi-transparent dark backgrounds. Game-world artifacts bleed through, making OCR noisy. Mitigations:

- **Dual-channel OCR** for level/class lines — grayscale for white text, R channel for golden/purple text
- **Multi-threshold status detection** — tries 3 threshold/channel combos, picks the first known status
- **Fuzzy matching** — clan names and class names are matched against known values to correct OCR errors
- **Cross-screenshot merging** — when the same tribesman appears in multiple screenshots, picks the best OCR result per field based on a quality score
