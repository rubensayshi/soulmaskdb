# Change review skill

Claude Code skill that generates an HTML report of code changes for visual review of agent work.

## Problem

Reviewing agent work means digging through terminal diffs and git logs. An HTML report with summaries, syntax-highlighted diffs, and screenshots is faster and more thorough.

## Design

### Inputs

- **Diff range** (optional arg): defaults to `origin/master...HEAD`. Accepts branch names, commit SHAs, `HEAD~N`.
- Examples: `/change-review`, `/change-review HEAD~3`, `/change-review feat/food-filters`

### Flow

1. **Determine diff range** — parse arg or default to `origin/master...HEAD`
2. **Gather changes** — `git diff --stat` and `git diff` for the range
3. **Analyze and summarize** — Claude (already running) reads the diff and writes:
   - Overall changeset summary (what changed and why)
   - Per-file explanation for files with meaningful changes (skip generated/trivial files)
4. **Infer affected routes** — map changed frontend files to routes:
   - `web/src/pages/Home.tsx` -> `/`
   - `web/src/pages/FoodAlmanac.tsx` -> `/food-almanac`
   - `web/src/pages/ItemDetail.tsx` -> `/item/:id` (pick an item ID from the diff context, or fall back to `BP_GongJu_FuZi_4` (Iron Axe))
   - `web/src/pages/TechTree.tsx` -> `/tech-tree`
   - `web/src/pages/AwarenessXp.tsx` -> `/awareness-xp`
   - Shared components -> screenshot all pages that use them
   - Backend-only or pipeline-only changes -> skip screenshots
5. **Ensure dev server** — check if dev server is running (`curl localhost:5173`). If not, run `make dev` and wait for it to come up.
6. **Capture screenshots** — use Playwright MCP to navigate to affected routes and take screenshots. Best-effort: skip gracefully if Playwright unavailable.
7. **Generate HTML** — single self-contained file with:
   - Header: branch name, diff range, file stats
   - Summary section
   - Screenshot gallery (inline base64 images)
   - Per-file cards: explanation + collapsible syntax-highlighted diff
   - All CSS/images inline (no external deps)
8. **Write and open** — save to `.claude/reviews/<branch>-<YYYYMMDD-HHMM>.html`, open in browser

### HTML report structure

```
+---------------------------------------+
| Change review: feat/food-filters      |
| 12 files, +340 -89                    |
| origin/master...HEAD                  |
+---------------------------------------+
| Summary                               |
| Added map filter to food almanac...   |
+---------------------------------------+
| Screenshots                           |
| [/food-almanac]  [/item/wood]         |
+---------------------------------------+
| Files changed                         |
| +- web/src/pages/FoodAlmanac.tsx ----+|
| | Added jungle/sands map toggle      ||
| | [> Show full diff]                 ||
| +------------------------------------+|
| +- backend/internal/api/food.go -----+|
| | New query param for map filter     ||
| | [> Show full diff]                 ||
| +------------------------------------+|
+---------------------------------------+
```

### Styling

- Dark theme matching the repo's dark nav (#16212B background, white text)
- Diff highlighting: green for additions, red for deletions
- Collapsible sections use `<details>/<summary>` — no JS needed
- Screenshots displayed at reasonable width with click-to-expand
- Monospace font for diffs (JetBrains Mono with system fallback)

### File categorization

Skip or collapse these file types (low signal):
- Generated files (`backend/internal/db/gen/*`)
- Lock files (`pnpm-lock.yaml`)
- Build artifacts
- Files with only whitespace/formatting changes

### Route inference

The skill maps changed source files to routes by:
1. Direct page match: `web/src/pages/<Name>.tsx` -> known route
2. Component usage: grep the component name in page files to find which pages use it
3. API changes: if backend API handlers change, screenshot the pages that consume those endpoints
4. Fallback: if unsure, screenshot the home page

### Output location

- Path: `.claude/reviews/<branch>-<YYYYMMDD-HHMM>.html`
- `.claude/reviews/` must be gitignored
- Auto-opens via `open` command on macOS

### What the skill does NOT do

- No external API calls — Claude writes the summaries as part of skill execution
- No npm/pip dependencies — uses git, Playwright MCP, and shell tools
- Does not modify code or git state
- Does not stop the dev server if it started one
