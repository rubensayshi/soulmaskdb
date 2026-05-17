# Screenread — tribesman roster scanner

**Date:** 2026-05-17
**Status:** Approved

## Goal

Desktop app that captures screenshots of the Soulmask tribesman list, recognizes each tribesman's name/level/clan/class/title and trait icons via local image processing, and displays the parsed roster in a searchable table.

## Architecture

```
┌─────────────────────────────────────┐
│  Tauri App                          │
│  ┌──────────┐    ┌───────────────┐  │
│  │ React UI │◄──►│ Rust backend  │  │
│  │ (table,  │    │ (capture,     │  │
│  │  filters)│    │  file mgmt,   │  │
│  └──────────┘    │  sidecar IPC) │  │
│                  └───────┬───────┘  │
│                          │          │
│                  ┌───────▼───────┐  │
│                  │ Python sidecar│  │
│                  │ (OpenCV +     │  │
│                  │  Tesseract +  │  │
│                  │  template     │  │
│                  │  matching)    │  │
│                  └───────────────┘  │
└─────────────────────────────────────┘
```

**Flow:**
1. User clicks "Capture" → Rust screenshots the game window (or user imports image files)
2. Rust passes image path to the Python sidecar
3. Python detects tribesman cards, OCRs text, template-matches trait icons
4. Python returns structured JSON → Rust passes to React frontend
5. Frontend displays roster table, persists to local JSON

## Image processing pipeline

Four stages, all in the Python sidecar:

### Stage 1: Card detection
- In-game UI is a 2-column grid of tribesman cards with consistent dark borders
- Detect cards via contour/edge detection on the grid lines
- Fixed internal layout per card — once bounds are found, text and icon regions have known offsets

### Stage 2: Text extraction (per card)
- Crop known regions: name (top-left, large font), level+class+clan (second line), title (after class)
- Tesseract OCR on each cropped region separately
- Regex parsing: split level number, class name, clan from `<brackets>`, title

### Stage 3: Trait icon extraction (per card)
- Trait icons sit in a row below the text, left-aligned, evenly spaced, fixed size (~24-32px)
- Crop the icon row, segment individual icons
- Badge shape (hexagon/diamond/shield) helps locate boundaries

### Stage 4: Trait matching
- `cv2.matchTemplate` each extracted icon against the reference atlas (366 composited icons)
- Best match above confidence threshold wins
- Badge shape cross-validates trait source type (hexagon=learned, diamond=preference, shield=innate)
- Output: trait IDs with confidence scores

### Reference atlas generation
- Built at build time by `gen_atlas.py`
- Takes raw trait icons from `Game/Icons/tianfu_*.webp` + badge shape masks (hexagon/diamond/shield)
- Composites each icon onto its badge at the expected in-game pixel size
- Outputs to `assets/atlas/` (gitignored)

## Data model

### Tribesman object

```json
{
  "name": "Animals ONLY",
  "level": 50,
  "class": "Master Hunter",
  "clan": "Claw Tribe",
  "title": "Weapon Master",
  "location": "Javis - Core",
  "traits": ["100011", "100045", "100102"],
  "captured_at": "2026-05-17T14:30:00Z"
}
```

### Persistence
- Single JSON file in Tauri's `appDataDir`
- Contains `last_updated` timestamp + `tribesmen[]` array
- Merge strategy for multiple captures: match by tribesman name, update existing, append new

### Trait metadata
- Bundled `traits.json` (copied from `Game/Parsed/traits.json` at build time)
- All lookups are local — no network calls

## Project structure

```
screenread/
├── src-tauri/           # Rust backend
│   ├── src/
│   │   ├── main.rs      # Tauri entry, commands, sidecar IPC
│   │   └── capture.rs   # Screen capture (Windows APIs, no-op on Mac)
│   └── Cargo.toml
├── src/                 # React frontend
│   ├── App.tsx          # Router, main layout
│   ├── pages/
│   │   └── Roster.tsx   # Table view
│   ├── components/
│   │   ├── CapturePanel.tsx
│   │   ├── TraitIcon.tsx
│   │   └── ReviewRow.tsx
│   └── lib/
│       ├── types.ts     # Tribesman, Trait interfaces
│       └── store.ts     # Zustand state
├── sidecar/             # Python image processing
│   ├── process.py       # Main entry: image path → JSON stdout
│   ├── detect_cards.py  # Stage 1: find tribesman cards
│   ├── ocr_text.py      # Stage 2: extract text per card
│   ├── match_traits.py  # Stage 3-4: extract + match icons
│   └── gen_atlas.py     # Build-time: composite reference atlas
├── assets/
│   ├── traits.json      # Bundled trait metadata
│   └── atlas/           # Generated reference icons (gitignored)
├── test/
│   └── fixtures/        # Sample screenshots for dev/testing
└── package.json         # React + Vite + Tailwind
```

## Technology choices

| Component         | Technology                           | Why                                                    |
| ----------------- | ------------------------------------ | ------------------------------------------------------ |
| Desktop shell     | Tauri 2                              | Small binary, native feel, React frontend              |
| Frontend          | React + TypeScript + Vite + Tailwind | Same stack as Codex, fast dev                          |
| State             | Zustand                              | Lightweight, familiar from Codex                       |
| Rust backend      | Tauri commands + sidecar API         | Screen capture, file I/O, Python IPC                   |
| Screen capture    | `xcap` crate                         | Cross-platform (Windows + Mac for dev)                 |
| Image processing  | OpenCV (`cv2`) + pytesseract         | Mature template matching + OCR                         |
| Atlas generation  | Pillow (PIL)                         | Composite icons onto badge shapes                      |
| OCR engine        | Tesseract 5                          | Free, local, good on clean UI text                     |
| Persistence       | Local JSON file                      | Simple, no DB needed for ~100 entries                  |

## Dev workflow

**On Mac:**
1. Sample screenshots in `test/fixtures/`
2. Iterate Python sidecar against fixtures (card detection, OCR, template matching)
3. Build React UI with fixture data
4. `cargo tauri dev` for integrated development

**On Windows:**
- Screen capture integration with the actual game
- End-to-end testing: capture → process → display
- Atlas validation against live game rendering

## v1 scope

**In:**
- Screen capture (Windows) + image file import (Mac dev)
- Card detection, text OCR, trait icon matching
- Roster table with sort, filter, trait icon tooltips
- Low-confidence flagging with manual correction
- Local JSON persistence
- Reference atlas auto-generation from existing trait icons

**Out:**
- Trait optimization / scoring
- Gap analysis
- Proficiency parsing
- Cloud sync / sharing
- Auto-scrolling the game
