# Handoff: Soulmask Tribesman Desktop

## Overview

A Tauri-based Windows desktop companion to the **Soulmask Codex** web app. Players capture screenshots of their in-game tribesman list; a Python sidecar (OpenCV + Tesseract) parses each card's name, level, clan, class, title, status, **group assignment**, and 6–16 trait icons; results land in a searchable, sortable, filterable local roster.

The HTML files in this bundle are **design references** built as a single-page React/Babel prototype. They show the intended look, motion, and interactions. The Claude Code implementation should **recreate these designs in the real Tauri + React + TypeScript + Tailwind codebase** described in the spec, using the codebase's existing patterns — not ship the HTML directly.

## Fidelity

**High-fidelity.** All colors, type scale, spacing, layout proportions, badge shapes, animations and interaction states in the prototype are final and should be matched closely. The only items left as placeholders are real trait icon `.webp` assets (rendered as procedural SVG glyphs in the prototype) and screenshot crops in the review step (striped placeholders).

## Stack target

| Concern         | Use                                                            |
| --------------- | -------------------------------------------------------------- |
| Shell           | Tauri 2.x (Windows primary, macOS for dev)                     |
| UI              | React 18 + TypeScript                                          |
| Styling         | Tailwind CSS (custom tokens — see Design Tokens below)         |
| Sidecar         | Python (OpenCV 4.9 + Tesseract 5.3 + trait-classifier model)   |
| Persistence     | JSON on disk at `%LOCALAPPDATA%/Soulmask Codex/roster.json`    |
| Window size     | 1280×800 minimum, resizable, 1440×900 design baseline          |

The prototype draws its own Windows 11 title bar (`.titlebar` in the HTML). In Tauri, **disable the system decorations and ship a custom title bar** to match — drag region marked with `-webkit-app-region: drag`, controls (min/max/close) marked `no-drag`.

## Screens & views

### 1. App shell

**Persistent chrome present in every screen:**

- **Custom title bar** (height `36px`)
  - Left: 16px compass logo + "Soulmask Codex" + `v0.4.0 · TAURI` version tag
  - Center: live hotkey indicator pill — pulsing dot + `CAPTURE READY · Alt + Shift + S`. The pulse is a subtle 2.4s ease-in-out opacity+scale loop. This is the "subtle indicator" — capture is hotkey-first.
  - Right: minimum/maximize/close window controls (46×36px each, hover bg `oklch(0.24 0.010 130)`, close button hover bg `#c42b1c`)

- **Left rail** (width `56px`, background `oklch(0.14 0.006 130)`, right border `1px solid var(--border-soft)`)
  - 32px compass logo at top
  - 40×40 icon buttons: Roster (people glyph), Capture (camera), Review queue (flag with red/gold badge when items pending)
  - Spacer
  - Bottom: Empty-state demo button (sun glyph — remove in production), Settings (cog)
  - Active state: accent-colored icon + 2px vertical accent bar on the left edge with a soft glow

- **Top bar** (height `56px`, padded `0 22px`, bottom border `1px solid var(--border-soft)`, bg `oklch(0.165 0.006 130 / 0.7)`)
  - Page title using `Cormorant Garamond` 22px/500 — current page name in upright, qualifier ("Roster") in italic accent color
  - Count chip — mono 10px uppercase, separated by left border
  - Italic timestamp ("captured 17 minutes ago") in muted serif
  - Spacer
  - **Layout segmented control** (3 buttons: Table / Cards / Split). Active state uses accent glow with inset 1px accent border. Icons are 12px line glyphs.
  - Search input (280×30, italic placeholder, search glyph + `⌘K` kbd hint)
  - Export button (outlined)
  - Capture button (primary — accent-glow bg, accent border, accent text)

- **Filter bar** (only on table + cards layouts; shown below top bar)
  - Padded `14px 22px`, dark bg, bottom border
  - Mono uppercase labels: `Clan`, `Status`, **`Group`** (group label sits on the second wrap-row)
  - Chip buttons (26px height, 999px radius, 1px border). Active chip gets accent glow + accent border + accent text + colored dot inside.
  - For clan chips, the active state uses **that clan's hue** as the border + text color (e.g. Claw = warm red-orange `oklch(0.72 0.13 30)`).
  - **Clan and Status are single-select.** **Group is multi-select** — click multiple group chips to combine (e.g. show Vanguard + Long Patrol). A `· N active` mono caption appears at the end when one or more group filters are on. "All" clears the group selection.

### 2. Empty / first-run state

Shown when there is no roster on disk.

- Centered content (max 540px) on top of an animated 520px compass-radar SVG (0.55 opacity, behind content)
  - Radar: 4 concentric circles + cardinal crosshairs + sweep cone rotating 360° over 6s
  - Center: codex mask glyph (diamond + two gold eyes + chin line)
- Pre-title small caps: `◆ The Tribesman Atlas` (mono 10px, gold, 0.18em tracking)
- H2: "NO ROSTER" / "yet captured." — Cormorant Garamond 56px/600, second line italic 500 in accent
- Lede: italic serif 18px muted — "Your tribe will appear once the codex sees them."
- Body: 13px muted, max 420px wide, 1.6 line-height — explains the capture workflow
- Action row: keyboard hint `Alt + Shift + S to capture` (kbd blocks: 3px borders, 2px bottom border, mono) + primary "Capture now" button + outlined "Import images" button
- Footer row: 3 mono micro-pills — "Local-only · no cloud sync", "Encrypted at rest", "Tauri sidecar v0.3.1"

### 3. Roster — Table layout (default)

The primary view.

- Compact (38px row height) or comfortable (48px) — bound to user preference, default **comfortable**.
- Sticky header row, mono 10px uppercase, 0.12em tracking, muted color
- Click any header to toggle asc/desc; active header shows accent ▲/▼ glyph
- Click any row to expand inline detail (see "Row detail" below); click again to collapse
- Hover: row bg `oklch(0.20 0.008 130 / 0.6)`
- Open row: bg `oklch(0.22 0.012 140 / 0.45)` and the detail panel uses an accent-colored top border

**Columns (in order):**

| Column   | Width | Content & styling                                              |
| -------- | ----- | -------------------------------------------------------------- |
| ◀        | 24px  | chevron — rotates 90° when row open, accent color              |
| Name     | flex  | Cormorant 16px/500 on top **+ group tag and `· location` sub** below |
| Lv.      | 72px  | Cormorant 17px in accent, prefixed by mono `Lv.` micro-label   |
| Class    | 160px | sans 12.5px text-dim                                           |
| Clan     | 100px | Clan tag pill (see component below)                            |
| Title    | 170px | Cormorant italic 14px in gold; em-dash for none                |
| Traits   | 34%   | Trait badge row (see component)                                |
| Prof.    | 80px  | 4×2 grid of 6px proficiency squares                            |
| Status   | 130px | Status pill (see component)                                    |

### 4. Roster — Cards layout

Grid of cards (`repeat(auto-fill, minmax(340px, 1fr))`, 14px gap, 20×22px padding).

- Card: bg `var(--bg-elev)`, 1px soft border, 6px radius, padded 14×16px
- 3px-wide clan-hue accent stripe on the left edge (opacity 0.7)
- Hover: border color → accent-soft
- Header: serif 19px name + accent level number
- Meta row: clan tag + class + dot separator + location, all 11.5px
- Title row: italic gold serif 14px
- Traits row: badge list (top-3 + overflow when in cards mode)
- Footer row: status pill + mono trait count

### 5. Roster — Split layout

Two-column. Left list (320px) + right detail (rest).

- Left col: bg slightly darker `oklch(0.155 0.006 130)`, right border
- Each list item (12×16px padding): 6px clan-hue dot + name (serif 15px) + LV/class sub (mono 10.5px uppercase) + status pill on right
- Selected item: accent glow bg + 2px accent left border
- Right col: 28×32 padded
  - Hero: 36px serif name + 22px accent level + clan tag + class + dot + italic gold title
  - Info strip card: location + status pill
  - Then the same `ExpandedRow` content used inline in the table layout (meta grid + proficiency grid + trait list grouped by source)

### 6. Row detail (table + split)

Two-column inside an accent-bordered panel.

- **Left:** "◆ Details" mono header → 2-col `dl` grid (Class, Title, Location, Status, Clan).
  Then "◆ Proficiencies" — 4-col grid of `LABEL ▮▮▮▮▯▯▯▯` mini bar-style rows.
- **Right:** "◆ Traits · N" header → flat list of every trait, **grouped hexagon → shield → diamond** to read source order ("learned, then innate, then preference"). Each trait detail row: 34px badge + name + ★ gold stars (1–3 filled / dim for rest) + source label colored by shape + effect text.

### 7. Trait badges

Three procedural SVG shapes (24×24 viewBox), each rendered with a stroke + fill + 1 of 10 procedural inner glyphs hashed from the trait id:

| Shape   | Meaning              | Stroke / fill / glyph hue        |
| ------- | -------------------- | -------------------------------- |
| Hexagon | Learned · Talent     | teal `oklch(... 165)`            |
| Shield  | Innate · Tribe-born  | amber `oklch(... 80)`            |
| Diamond | Preference (like/hate) | sage `oklch(... 130)`          |

Below the badge: a 3-dot star pip row (1.5px gap, 3px dots, gold when filled, dim otherwise) showing tier 1–3.

In production these will be replaced by the 366 actual trait `.webp` icons composited onto these shape frames — the prototype's procedural glyphs are stand-ins.

### 8. Trait tooltip (hover)

Floating 260px panel positioned 8px below the badge.

- Bg `oklch(0.20 0.010 130)`, 1px strong border, 6px radius, deep shadow
- 34px badge + name (serif 15px) + filled/dim gold ★ row
- Source line in shape color, mono 9px caps
- Effect text 11.5px muted

**Important:** the prototype positions tooltips inside the scaled `.win-scale` element to keep them on top of the parchment grain (z-index 200). In the real app this should be a Radix Popover or react-tippy with bottom placement.

### 9. Status pill

Pill with 8px colored dot + mono uppercase label.

| Status     | Dot color                              | Animation                                |
| ---------- | -------------------------------------- | ---------------------------------------- |
| Idle       | sage `oklch(0.65 0.05 130)`            | 2.6s pulse opacity+scale                 |
| Hosting    | gold `var(--gold)`                     | 3s glow pulse (box-shadow expand/contract) |
| Mining     | warm `oklch(0.7 0.08 60)`              | 2s outward ripple via `::after`          |
| Work Break | desaturated sage                       | none                                     |
| Resting    | blue `oklch(0.5 0.02 220)`             | 3.5s slow pulse                          |

All animations disable when the "Status animations" preference is off (`.no-status-anim` class).

### 10. Clan tag

26px-ish pill with 1px `currentColor` border, 5px solid dot inside, mono 9.5px caps 0.1em tracking. Color comes from the clan hue (CSS var). Seven clans:

| Clan  | Hue                       |
| ----- | ------------------------- |
| Claw  | `oklch(0.72 0.13 30)`     |
| Flint | `oklch(0.70 0.10 240)`    |
| Fang  | `oklch(0.72 0.10 320)`    |
| Wolf  | `oklch(0.72 0.04 280)`    |
| Horn  | `oklch(0.74 0.09 85)`     |
| Exile | `oklch(0.70 0.10 200)`    |
| DLC   | `oklch(0.70 0.13 290)`    |

### 11. Group tag

A distinct visual from the clan tag so the two don't get confused.

- 6-dot grid glyph (3×2 dots in accent at 0.75 opacity) + mono 9.5px uppercase name in `--text-dim`
- No pill outline — sits inline with other meta
- Special-case rendering for `unassigned`: 0.55 opacity + italic
- Used under the name in table rows, in the meta line of cards, in the split-list sub-row, and in the meta grid of the detail panel

**Groups in the prototype** (player-defined in production):

| id           | Label         | Typical role          |
| ------------ | ------------- | --------------------- |
| `vanguard`   | Vanguard      | Frontline fighters    |
| `hearth`     | Hearth Crew   | Base caretakers       |
| `patrol`     | Long Patrol   | Scouts & rangers      |
| `forge`      | Forge Hands   | Smiths & crafters     |
| `foragers`   | Foragers      | Gatherers & farmers   |
| `unassigned` | Unassigned    | No group set in-game  |

In-game group names are user-defined so the production app should treat the group list as dynamic (read from the parsed captures, not hard-coded). Persist the canonical set in the roster JSON so the filter chip set stays stable between sessions.

### 12. Capture modal

Triggered by `Alt + Shift + S`, the top-bar Capture button, the rail Capture button, or empty-state CTA.

Three phases inside a 640px modal:

1. **Pick** — header "Capture Roster". Two large 76px buttons side-by-side: primary "Capture screen" (camera glyph + target window subtitle) and outlined "Import images" (export glyph + format list). Below: `◆ SOURCE PREVIEW` section header + a dashed drop zone showing 3 striped thumbnail placeholders + "Drag images here · or paste from clipboard ⌘V" instruction. Footer: dedup-on hint + Cancel.

2. **Processing** — header "Capture Roster". Italic accent caption "Reading the masks…" + % counter. Progress bar (4px, accent→gold gradient, glow). **Five pipeline tiles** (`Names`, `Clans`, `Groups`, `Traits`, `Status`) light up sequentially at ~18/36/54/72/88% — outline goes from soft border → accent border + accent-glow bg, with a check glyph. Stats row: screenshots count, tribesmen found (animates up), sidecar engine label.

3. **Summary** — header "Capture Complete". Three large stat columns: total found / high confidence / need review (the last in gold). Body text explains the threshold. Footer: "Skip review" (outline) + "Review N items" (primary).

### 13. Review screen

Full-screen takeover (top bar changes to a "← Back to roster" button + a mono capture summary on the right).

- Header: gold pre-title `◆ CONFIDENCE BELOW 80%`, H2 "Review **4 items**", muted sub-line, progress bar + `2/4 REVIEWED` counter + Skip / Commit roster buttons.
- List of review cards (1px border, 6px radius, accent-bordered + accent-tinted bg when confirmed).
- Each card: 3-col grid `130 | flex | auto`
  - Left: mono caption ("◆ TRAIT ICON · 1") + 60px striped crop placeholder (in production: actual cropped pixels from the screenshot).
  - Middle: tribesman name + field type ("· trait") + 2–3 confidence options. Each option: outlined pill, name + small mono `pct%`. Selected option: accent border, accent-glow bg, accent text.
  - Right: status — "◆ AWAITING" (gold) or "✓ CONFIRMED" (accent).

### 14. Settings modal

520px modal, scrollable. Header "Settings".

Three groups (h3 mono 10px caps gold, group dividers via bottom border):

1. **◆ Capture**
   - Global hotkey: 4 togglable modifier pills (Ctrl, Alt, Shift) + single-char input
   - Capture target: select — "SoulMask.exe (auto)", "Primary monitor", "Custom region…"
   - Confidence threshold: range slider 50→95 step 5, accent track, mono accent value

2. **◆ Roster**
   - Auto-merge captures: toggle
   - Deduplicate by: select — Name / Name+level / Name+clan+class
   - Data location: mono readonly path + Browse button

3. **◆ Sidecar**
   - Status badge: `● RUNNING` pill (accent text, accent glow bg, mono caps)
   - Launch with Windows: toggle

Toggle component: 36×20px pill with 14px circle thumb. Off = border, muted thumb. On = accent-soft bg, accent border, accent thumb with glow, thumb at right.

## Interactions & behavior

- **Hotkey**: global `Alt+Shift+S` opens the capture modal. `Esc` closes any modal and exits review mode.
- **Sort**: click a column header → toggles between asc/desc/asc. Active column shows accent arrow.
- **Expand row**: click anywhere on a row to toggle the detail panel inline. Only one row expanded at a time in this design (single-id state) but the spec allows multi-expand if preferred.
- **Filter & search**: filters and search are AND-composed. Empty search keeps all rows.
- **Trait hover**: hovering any badge or text chip opens the tooltip after a short delay (in the prototype it's immediate; in the real app use ~250ms).
- **Modal click-outside**: clicking the overlay outside the modal box closes it.
- **Capture progress**: simulated as 60ms ticks of +2.5%. In production this is driven by sidecar progress events.
- **Review confirm**: clicking a confidence option marks that item `fixed`. Items not reviewed adopt the highest-confidence guess when the user clicks Commit.

## State management

Suggested top-level state (Zustand or Context):

```ts
interface AppState {
  roster: Tribesman[];               // persisted to disk
  groups: Group[];                   // discovered from captures, persisted
  captureQueue: CaptureBatch[];      // staged captures awaiting review
  reviewItems: ReviewItem[];         // low-confidence items (incl. group misreads)
  filters: {
    clan: ClanFilter;                // single-select
    status: StatusFilter;            // single-select
    groups: string[];                // multi-select — empty = all
  };
  query: string;
  sort: { key: SortKey; dir: 'asc' | 'desc' };
  expandedId: string | null;
  selectedSplitId: string | null;
  layout: 'table' | 'cards' | 'split';
  modal: null | 'capture' | 'settings';
  reviewActive: boolean;
  prefs: {
    density: 'compact' | 'comfortable';
    accent: 'sage' | 'amber' | 'blue' | 'mono';
    showProf: boolean;
    grain: boolean;
    statusAnim: boolean;
    confidenceThreshold: number;     // 50–95
    hotkey: { ctrl: boolean; alt: boolean; shift: boolean; key: string };
    captureTarget: 'soulmask.exe' | 'primary-monitor' | 'region';
    autoMerge: boolean;
    dedupBy: 'name' | 'name-level' | 'all';
    launchWithWindows: boolean;
    dataPath: string;
  };
}

interface Tribesman {
  id: string;
  name: string;
  level: number;
  klass: string;
  clan: 'Claw' | 'Flint' | 'Fang' | 'Wolf' | 'Horn' | 'Exile' | 'DLC';
  group: string;                     // group.id; 'unassigned' when none
  title: string;
  location: string;
  status: 'idle' | 'hosting' | 'mining' | 'work-break' | 'resting';
  traits: Trait[];
  prof: number[];                    // 8 slots, values 0–3
}

interface Group {
  id: string;                        // slug
  name: string;                      // player-visible label
  hint?: string;                     // optional role description
}
```

Persist `roster`, `prefs`, and the last `layout` to JSON. Reopen the app and re-hydrate.

## Sidecar additions for Groups

The Python recognition pipeline must be extended to parse the group label on each card.

- **Location on card**: the group label appears as a short text tag near the tribesman's name in-game (exact pixel region TBD by the sidecar developer — sample images supplied separately).
- **Output field**: emit `group: string` per tribesman in the JSON contract. Empty / not detected → the literal string `"unassigned"`.
- **Group registry**: emit a top-level `groups` array of `{ id, name }` so the app can pick up new groups when a player renames or adds one. The id is a slug of the name (lowercase, hyphenated). Names with non-ASCII characters preserve the original in `name` and slugify the id.
- **Low confidence**: if the group OCR confidence is below the user's threshold, include the field in `review_items` with `field: 'group'` and `options` ranked by confidence — the review screen already handles this case (rev5 in the mock data).

## Tauri integration notes

- Register the global hotkey via `@tauri-apps/plugin-global-shortcut`. Allow rebinding from Settings.
- Capture target = `soulmask.exe (auto)`: enumerate windows, match title, screenshot just that one. Fallback to primary-monitor on miss.
- Sidecar: spawn the Python process at startup using Tauri sidecar pattern. Pipe JSON over stdio. Show `● RUNNING` in Settings when the heartbeat is fresh (< 5s); else `● STOPPED`.
- Drop zone accepts file paths via Tauri's file-drop event.

## Design tokens

All set as CSS custom properties on `:root`. Convert to `tailwind.config.js` `theme.extend`:

### Colors (oklch — accurate translation matters)

```
--bg-deep:        oklch(0.13 0.006 130)   /* #0F1410 ~ */
--bg:             oklch(0.16 0.006 130)
--bg-elev:        oklch(0.19 0.008 130)
--bg-card:        oklch(0.21 0.009 130)
--bg-hover:       oklch(0.24 0.010 130)

--border:         oklch(0.30 0.012 130)
--border-soft:    oklch(0.24 0.011 130)
--border-strong:  oklch(0.38 0.013 130)

--text:           oklch(0.92 0.018 95)   /* warm off-white */
--text-dim:       oklch(0.75 0.018 100)
--muted:          oklch(0.58 0.015 110)
--faint:          oklch(0.42 0.012 110)

/* Accent — sage default */
--accent:         oklch(0.80 0.06 140)
--accent-soft:    oklch(0.42 0.04 140)
--accent-glow:    oklch(0.80 0.06 140 / 0.18)

--gold:           oklch(0.78 0.10 80)
--gold-soft:      oklch(0.45 0.06 80)

/* Tier badges (used in DLC-style markers) */
--tier-s:         oklch(0.70 0.14 25)
--tier-a:         oklch(0.74 0.11 70)
--tier-b:         oklch(0.70 0.11 290)
```

### Type

```
--serif: "Cormorant Garamond", "EB Garamond", Georgia, serif;
--sans:  "Manrope", ui-sans-serif, system-ui, sans-serif;
--mono:  "IBM Plex Mono", ui-monospace, monospace;
```

Type scale used in the design:

| Token name (suggested) | Size  | Use                                        |
| ---------------------- | ----- | ------------------------------------------ |
| display-xl             | 56px  | Empty-state H2                             |
| display                | 36px  | Split-detail name                          |
| h1                     | 22px  | Top-bar title                              |
| h2                     | 19px  | Card name                                  |
| h3                     | 16px  | Table name cell                            |
| body                   | 13px  | Default                                    |
| body-sm                | 12px  | Class cells, detail meta values            |
| caption                | 11.5px | Card meta, detail effect lines            |
| micro                  | 10px  | Mono small-caps section headers           |
| nano                   | 9–9.5px | Mono labels inside chips & tags           |

### Spacing & radii

```
--r-sm: 4px;   --r: 6px;   --r-lg: 10px;
--row-h-compact: 38px;
--row-h-regular: 48px;
```

Tailwind-friendly spacing: 2/4/6/8/10/12/14/16/18/22/28/32/40.

### Shadows

```
modal-shadow:  0 30px 80px rgba(0,0,0,0.5)
panel-shadow:  0 10px 30px rgba(0,0,0,0.5)
tooltip-glow:  0 0 12px var(--accent-glow)
window-shell:  0 30px 80px -10px rgba(0,0,0,0.6),
               0 12px 30px -6px rgba(0,0,0,0.4),
               0 0 0 0.5px oklch(0.45 0.015 130 / 0.8)
```

## Animations

| Name                | Element                        | Timing                  |
| ------------------- | ------------------------------ | ----------------------- |
| `pulse`             | hotkey dot, idle status, resting | 2.4–3.5s ease-in-out infinite |
| Hosting glow        | hosting status                 | 3s box-shadow loop      |
| Mining ripple       | mining status `::after`        | 2s ease-out infinite    |
| Radar sweep         | empty-state radar              | 6s linear infinite      |
| Capture progress    | 4px gradient bar               | 0.4s ease width transition |
| Row chevron         | open/close                     | 0.15s rotate(90deg)     |
| Hover bg            | rows                           | 0.10s background fade   |
| Button border + bg  | all .btn, .chip                | 0.12s                   |

Use `prefers-reduced-motion` to disable all status indicator animations and the radar sweep.

## Texture overlay

A subtle fractal-noise SVG layered over the whole app surface (`app::before`), `mix-blend-mode: overlay`, 0.6 opacity, 200×200 tiled. Disable with `.no-grain` class when the user toggles off "Parchment grain" in Settings. Inline SVG (no asset file needed):

```html
<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>
  <filter id='n'>
    <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>
    <feColorMatrix values='0 0 0 0 0.85  0 0 0 0 0.8  0 0 0 0 0.6  0 0 0 0.06 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#n)'/>
</svg>
```

## Assets

- **Fonts**: Cormorant Garamond, Manrope, IBM Plex Mono — all Google Fonts, served via `@fontsource/*` packages or self-hosted.
- **Icons**: all 16–22px inline SVG line glyphs in `src/icons.jsx`. Port to a single icon module (or use `lucide-react` equivalents: `Search`, `Filter`, `Settings`, `Users`, `Camera`, `Flag`, `Plus`, `Check`, `ChevronRight`, `Table`, `LayoutGrid`, `Columns2`). The compass logo is custom — keep it as inline SVG.
- **Trait icons**: 366 `.webp` files (supplied separately per spec). Composite onto the three badge shape backgrounds at render time.

## Files in this bundle

| File                       | Contents                                                       |
| -------------------------- | -------------------------------------------------------------- |
| `Soulmask Desktop.html`    | Main entry — design tokens, layout, Win11 chrome, mounts React |
| `src/data.jsx`             | Mock roster, trait catalog, review queue                       |
| `src/icons.jsx`            | All inline SVG icons (Win controls + UI)                       |
| `src/badges.jsx`           | TraitBadge — hex/diamond/shield frames + procedural glyph      |
| `src/parts.jsx`            | ClanTag, StatusPill, ProfGrid, TraitsCell, TraitTooltip, Radar |
| `src/empty.jsx`            | First-run / empty state                                        |
| `src/roster.jsx`           | Table layout + sortable headers + ExpandedRow                  |
| `src/cards.jsx`            | Card grid layout                                               |
| `src/split.jsx`            | Split list-detail layout                                       |
| `src/capture.jsx`          | Capture modal (pick → progress → summary)                      |
| `src/review.jsx`           | Review/correction screen                                       |
| `src/settings.jsx`         | Settings modal                                                 |
| `src/app.jsx`              | Shell + screen routing + tweaks defaults                       |
| `src/tweaks-panel.jsx`     | Design-time only — DO NOT ship                                 |

`src/tweaks-panel.jsx` is the in-design controls used to compare options during review — it has no role in the production app and should be deleted on import.

## Open questions / not in v1

(From the spec — confirm with the user before adding.)

- Trait optimization / "best tribesman for X" scoring
- Trait gap analysis across the roster
- Multi-roster management (currently one roster)
- Cloud sync / sharing
- Proficiency parsing (UI is wired, sidecar doesn't extract yet)

## Final user preferences (locked in this build)

- **Layout**: in-product toggle (Table / Cards / Split). Default = `table`.
- **Density**: `comfortable` (48px row).
- **Proficiency column**: shown by default.
- **Accent**: `sage`.
- **Parchment grain**: on.
- **Status animations**: on.

These are persisted via the EDITMODE-BEGIN block in `src/app.jsx` and should be the initial values of the `prefs` slice in production.

## Late additions (after the prototype's first review)

- **Groups**: tribesman group assignment is now part of the data model, the OCR contract, the filter bar (multi-select), the review queue, and every roster layout. See § 11 "Group tag" and § "Sidecar additions for Groups" above.
