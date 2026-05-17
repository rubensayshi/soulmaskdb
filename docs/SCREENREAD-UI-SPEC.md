# Screenread — UI spec handover

## What this app does

A Windows desktop app (Tauri) that lets Soulmask players capture screenshots of their in-game tribesman list, automatically recognizes each tribesman's name, level, clan, class, title, and trait icons, and displays the parsed roster in a searchable table.

The image processing happens via a Python sidecar (OpenCV + Tesseract). The UI is a React frontend inside a Tauri shell.

## User flow

1. **Capture** — user clicks "Capture" button or hits a hotkey. App screenshots the game window (or user drags in image files).
2. **Processing** — app shows a progress indicator while the Python sidecar parses the screenshot(s).
3. **Review** — parsed roster appears in a table. User can verify/correct any misrecognized data.
4. **Persist** — roster is saved locally as JSON. Reopening the app loads the last roster.

Multiple screenshots are needed to capture a full roster (the in-game list scrolls). The app should handle merging results from multiple captures (dedup by tribesman name).

## The in-game screen being parsed

Two-column scrollable grid of tribesman cards. Each card contains:

| Element                  | Example                                    | Position in card       |
| ------------------------ | ------------------------------------------ | ---------------------- |
| Name                     | "Animals ONLY", "Base Sorter"              | Top-left, largest text |
| Location                 | "Javis - Core", "Zad - Swamps"             | After name, smaller    |
| Level + class + clan     | "LV.50 Master Hunter \<Claw Tribe\>"       | Second line, colored   |
| Title                    | "Weapon Master", "Farming Expert"          | After class            |
| Trait icons              | Row of 6-16 small badge icons              | Below text, left side  |
| Proficiency icons        | Grid of skill level indicators             | Right side of card     |
| Status                   | "Work Break", "Hosting", "Idle", "Mining"  | Bottom-right           |

Trait icons use three badge shapes indicating source type:
- **Hexagon** — learned traits (combat talents)
- **Diamond** — preferences
- **Shield** — innate traits (tribe-born, origin, title)

## Screens to design

### 1. Main screen — roster table

The primary view. A table of all parsed tribesmen.

**Columns:**

| Column   | Content                              | Sortable | Notes                          |
| -------- | ------------------------------------ | -------- | ------------------------------ |
| Name     | Player-given name                    | Yes      | Primary identifier             |
| Level    | 1-60                                 | Yes      | Numeric sort                   |
| Class    | "Master Hunter", "Skilled Laborer"   | Yes      | Game rank                      |
| Clan     | Claw, Flint, Fang, Wolf, Horn, etc.  | Yes      | Filter-friendly                |
| Title    | "Weapon Master", "Nightwalker"       | Yes      | Specialization                 |
| Traits   | Row of small trait icons             | No       | Hovering an icon shows name + description |

**Interactions:**
- Text filter (search by name, clan, or title)
- Column sort (click header to toggle asc/desc)
- Trait icon hover → tooltip with trait name, star level, and effect description
- Eventually: click a row to expand full trait details (v2)

### 2. Capture flow

Could be a modal overlay or a dedicated panel. Needs:
- "Capture screenshot" button (triggers screen capture on Windows)
- "Import image files" button/drop zone (for manual screenshots)
- Thumbnail preview of captured/imported images
- Progress bar during processing
- Summary after processing: "Found 14 tribesmen, 12 high confidence, 2 need review"

### 3. Review / correction screen

After processing, any low-confidence matches should be flagged. The user should be able to:
- See the cropped image region next to the recognized result
- Pick the correct trait from a dropdown/search if the match was wrong
- Confirm or dismiss flagged items

This could be inline in the table (highlight uncertain cells) or a separate review step before committing to the roster.

## Data available for display

Each tribesman object looks like:

```json
{
  "name": "Animals ONLY",
  "level": 50,
  "class": "Master Hunter",
  "clan": "Claw Tribe",
  "title": "Weapon Master",
  "location": "Javis - Core",
  "status": "Hosting",
  "traits": [
    {
      "trait_id": "100011",
      "name_en": "Swift Pace",
      "star": 1,
      "icon_name": "tianfu_yidongsudutisheng",
      "source": "Normal",
      "effect": "Movement speed +3%",
      "confidence": 0.94,
      "badge_shape": "hexagon"
    }
  ]
}
```

Trait metadata (names, descriptions, effects, star levels) comes from the bundled `traits.json` — same data as soulmask-codex.com.

## Trait icons

366 trait icons available as `.webp` files. In the app they render on colored badge backgrounds:
- Hexagon badge — teal/dark tones
- Diamond badge — green tones
- Shield badge — amber/brown tones

The badge compositing is done programmatically (same icons, different frames). The designer can reference the live trait browser at soulmask-codex.com/traits for how they look rendered.

## Design constraints

- **Framework:** Tauri (renders a webview, so standard HTML/CSS/JS)
- **Stack:** React + TypeScript + Tailwind CSS (same as the existing Codex site)
- **Platform:** Windows primary, but UI should render correctly on Mac for development
- **Window size:** assume 1280x800 minimum, resizable
- **Theme:** dark theme preferred (matches the game aesthetic). Can reference the Codex site's dark card styles.

## What's NOT in v1

- Trait optimization / scoring ("best tribesman for X")
- Trait gap analysis
- Multi-roster management (just one roster at a time)
- Cloud sync or sharing
- Proficiency parsing (only traits + text for now)
