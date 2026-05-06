# Change Review Skill Implementation Plan

**Goal:** Create a Claude Code skill that generates an HTML report of code changes with summaries, syntax-highlighted diffs, and screenshots for visual review of agent work.

**Architecture:** Single SKILL.md file that instructs Claude to gather git diffs, analyze changes, capture screenshots via Playwright MCP, and generate a self-contained HTML file. No external dependencies — Claude does the analysis and HTML generation inline.

**Tech Stack:** Git, Playwright MCP (screenshots), Bash (dev server check), Write tool (HTML output)

---

### Task 1: Create the skill file

**Files:**
- Create: `.claude/skills/change-review/SKILL.md`

This is the entire deliverable — one skill file. The skill is a set of instructions that Claude follows at invocation time. It contains:
1. Frontmatter (name, description, argument-hint)
2. Step-by-step instructions for Claude to execute
3. The HTML template that Claude fills in and writes via the Write tool
4. Route mapping table
5. File categorization rules

- [ ] **Step 1: Create the skills directory**

```bash
mkdir -p /Users/ruben/work/private/souldb/.claude/skills/change-review
```

- [ ] **Step 2: Write SKILL.md**

Create `.claude/skills/change-review/SKILL.md` with this content:

````markdown
---
name: change-review
description: Generate an HTML overview of code changes with summaries, diffs, and screenshots for reviewing agent work. Accepts optional diff range argument.
argument-hint: <diff-range, e.g. HEAD~3, branch-name, or commit SHA>
---

# Change review

Generate a self-contained HTML report of code changes for visual review.

## Inputs

- `$ARGUMENTS` — optional diff range. Defaults to `origin/master...HEAD`.
- Examples: `/change-review`, `/change-review HEAD~3`, `/change-review feat/food-filters`

## Step 1: Determine diff range

```bash
RANGE="${ARGUMENTS:-origin/master...HEAD}"
```

If `$ARGUMENTS` is a plain branch name (no `...`), use `origin/master...$ARGUMENTS`.
If `$ARGUMENTS` contains `~` or is a SHA, use `$ARGUMENTS` directly as the end of `origin/master...$ARGUMENTS`.
If `$ARGUMENTS` already contains `...` or `..`, use it as-is.

## Step 2: Gather changes

Run these commands and save the output:

```bash
git diff --stat $RANGE
git diff $RANGE
git log --oneline $RANGE
```

## Step 3: Categorize files

From the diff stat, split files into two groups:

**Show with explanation** (meaningful changes):
- `web/src/**` (frontend source)
- `backend/**` (Go source, excluding `backend/internal/db/gen/*`)
- `pipeline/**` (Python parsers)
- `data/translations/**`
- `Game/Parsed/**`
- Config files (`Makefile`, `ecosystem.config.js`, `fly.toml`, etc.)

**Skip or collapse** (low signal):
- `backend/internal/db/gen/*` (generated — just mention "sqlc regenerated")
- `pnpm-lock.yaml` (just mention "lockfile updated")
- `backend/internal/spa/*` (build artifact)
- Files with only whitespace/formatting changes

## Step 4: Analyze and summarize

For the report, write:

1. **Overall summary** (3-5 sentences): what changed and why, written for someone who hasn't seen the code. Mention the user-facing impact.

2. **Per-file explanation** for each meaningful file: 1-2 sentences on what changed in that file and why. Focus on the *what* and *why*, not line-by-line narration.

## Step 5: Infer affected routes

Map changed files to frontend routes using this table:

| Page file                     | Route              | Screenshot URL                      |
|-------------------------------|--------------------|-------------------------------------|
| `web/src/pages/Home.tsx`      | `/`                | `http://localhost:5173/`            |
| `web/src/pages/Item.tsx`      | `/item/:id`        | `http://localhost:5173/item/BP_GongJu_FuZi_4` |
| `web/src/pages/AwarenessXp.tsx` | `/awareness-xp`  | `http://localhost:5173/awareness-xp` |
| `web/src/pages/FoodAlmanac.tsx` | `/food-almanac`  | `http://localhost:5173/food-almanac` |
| `web/src/pages/Traits.tsx`    | `/traits`          | `http://localhost:5173/traits`      |
| `web/src/pages/TechTree.tsx`  | `/tech-tree`       | `http://localhost:5173/tech-tree`   |

Rules:
- If a page file changed → screenshot that route
- If a component in `web/src/components/` changed → grep page files that import it, screenshot those routes
- If only backend/pipeline/data files changed → skip screenshots
- For `/item/:id`: try to find an item ID mentioned in the diff. If none, use `BP_GongJu_FuZi_4` (Iron Axe)
- If nothing maps → screenshot `/` as fallback

Collect the list of URLs to screenshot.

## Step 6: Ensure dev server is running

Only if there are routes to screenshot:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/ 2>/dev/null
```

- If response is 200 → dev server is running, proceed
- If connection fails → run `make dev` in the project root, then poll `curl http://localhost:5173/` every 3 seconds until it responds (max 30 seconds). Note in the report that the dev server was started.

## Step 7: Capture screenshots

For each URL from step 5, use the Playwright MCP tools:

1. `mcp__playwright__browser_navigate` to the URL
2. Wait for the page to load (`mcp__playwright__browser_wait_for` for network idle or a short timeout)
3. `mcp__playwright__browser_take_screenshot` to capture the page

Save each screenshot. If Playwright MCP is unavailable or any screenshot fails, skip screenshots gracefully and note it in the report.

## Step 8: Generate and write the HTML report

Determine the output path:

```bash
BRANCH=$(git branch --show-current | sed 's/[^a-zA-Z0-9_-]/-/g')
TIMESTAMP=$(date +%Y%m%d-%H%M)
OUTPUT=".claude/reviews/${BRANCH}-${TIMESTAMP}.html"
mkdir -p .claude/reviews
```

Use the Write tool to create the HTML file at that path.

The HTML must be **completely self-contained** — all CSS inline in a `<style>` tag, all screenshots as inline base64 `data:` URIs. No external resources.

### HTML template

Use this structure (fill in the dynamic parts):

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Change Review: BRANCH_NAME</title>
<style>
  :root {
    --bg: #16212B;
    --bg-card: #1e2d3a;
    --bg-code: #0d1117;
    --text: #e6edf3;
    --text-muted: #8b949e;
    --green: #5BC477;
    --red: #f85149;
    --teal: #327D7B;
    --border: #30363d;
    --font-mono: "JetBrains Mono", "Fira Code", "Cascadia Code", monospace;
    --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-sans);
    line-height: 1.6;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
  .meta { color: var(--text-muted); font-size: 0.875rem; margin-bottom: 2rem; }
  .meta span { margin-right: 1.5rem; }
  .section { margin-bottom: 2rem; }
  .section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--teal);
    border-bottom: 2px solid var(--teal);
    padding-bottom: 0.375rem;
    margin-bottom: 1rem;
  }
  .summary { line-height: 1.8; color: var(--text); }
  .screenshots {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
    gap: 1rem;
  }
  .screenshot { position: relative; }
  .screenshot img {
    width: 100%;
    border-radius: 6px;
    border: 1px solid var(--border);
    cursor: pointer;
    transition: transform 0.2s;
  }
  .screenshot img:hover { transform: scale(1.02); }
  .screenshot img.expanded {
    position: fixed;
    top: 2rem; left: 2rem; right: 2rem; bottom: 2rem;
    width: auto; height: auto;
    max-width: calc(100vw - 4rem);
    max-height: calc(100vh - 4rem);
    object-fit: contain;
    z-index: 1000;
    background: var(--bg);
    border: 2px solid var(--teal);
    border-radius: 8px;
    padding: 1rem;
  }
  .screenshot-label {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-top: 0.375rem;
  }
  .file-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 6px;
    margin-bottom: 1rem;
    overflow: hidden;
  }
  .file-header {
    padding: 0.75rem 1rem;
    font-family: var(--font-mono);
    font-size: 0.875rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .file-path { color: var(--teal); font-weight: 600; }
  .file-stats { color: var(--text-muted); font-size: 0.8rem; }
  .file-stats .add { color: var(--green); }
  .file-stats .del { color: var(--red); }
  .file-explanation {
    padding: 0.75rem 1rem;
    color: var(--text);
    font-size: 0.9rem;
    border-bottom: 1px solid var(--border);
  }
  details summary {
    padding: 0.5rem 1rem;
    cursor: pointer;
    color: var(--text-muted);
    font-size: 0.8rem;
    user-select: none;
  }
  details summary:hover { color: var(--text); }
  .diff {
    background: var(--bg-code);
    padding: 1rem;
    overflow-x: auto;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    line-height: 1.5;
  }
  .diff-line { white-space: pre; }
  .diff-add { color: var(--green); background: rgba(91,196,119,0.1); }
  .diff-del { color: var(--red); background: rgba(248,81,73,0.1); }
  .diff-hunk { color: var(--teal); font-weight: 600; }
  .diff-context { color: var(--text-muted); }
  .overlay {
    display: none;
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.85);
    z-index: 999;
    cursor: pointer;
  }
</style>
</head>
<body>

<h1>Change review: BRANCH_NAME</h1>
<div class="meta">
  <span>TOTAL_FILES files changed</span>
  <span class="add">+INSERTIONS</span>
  <span class="del">-DELETIONS</span>
  <span>Range: DIFF_RANGE</span>
</div>

<div class="section">
  <div class="section-title">Summary</div>
  <div class="summary">
    OVERALL_SUMMARY_HERE
  </div>
</div>

<!-- Only include if screenshots were captured -->
<div class="section">
  <div class="section-title">Screenshots</div>
  <div class="screenshots">
    <!-- For each screenshot: -->
    <div class="screenshot">
      <img src="data:image/png;base64,BASE64_DATA" alt="ROUTE" onclick="toggleExpand(this)" />
      <div class="screenshot-label">ROUTE</div>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">Files changed</div>

  <!-- For each meaningful file: -->
  <div class="file-card">
    <div class="file-header">
      <span class="file-path">FILE_PATH</span>
      <span class="file-stats"><span class="add">+N</span> <span class="del">-N</span></span>
    </div>
    <div class="file-explanation">EXPLANATION</div>
    <details>
      <summary>Show full diff</summary>
      <div class="diff">
        <!-- Each line of the diff for this file, wrapped in a span: -->
        <div class="diff-line diff-hunk">@@ -10,6 +10,8 @@</div>
        <div class="diff-line diff-context"> unchanged line</div>
        <div class="diff-line diff-add">+added line</div>
        <div class="diff-line diff-del">-removed line</div>
      </div>
    </details>
  </div>

  <!-- For skipped/collapsed files, one summary card: -->
  <div class="file-card">
    <div class="file-header">
      <span class="file-path" style="color: var(--text-muted)">N files skipped</span>
    </div>
    <div class="file-explanation" style="color: var(--text-muted)">
      Generated files, lockfiles, or whitespace-only changes: list them here
    </div>
  </div>
</div>

<div id="overlay" class="overlay" onclick="closeExpand()"></div>

<script>
  let expanded = null;
  function toggleExpand(img) {
    if (expanded) { closeExpand(); return; }
    expanded = img;
    img.classList.add('expanded');
    document.getElementById('overlay').style.display = 'block';
  }
  function closeExpand() {
    if (expanded) { expanded.classList.remove('expanded'); expanded = null; }
    document.getElementById('overlay').style.display = 'none';
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeExpand(); });
</script>

</body>
</html>
```

### Diff formatting rules

When generating the diff HTML, for each line of the diff:
- Lines starting with `+` (but not `+++`) → class `diff-add`
- Lines starting with `-` (but not `---`) → class `diff-del`
- Lines starting with `@@` → class `diff-hunk`
- All other lines → class `diff-context`
- HTML-escape all diff content (`<`, `>`, `&`, `"`)

## Step 9: Open the report

```bash
open "$OUTPUT"
```

Report the file path to the user.
````

- [ ] **Step 3: Verify skill appears in Claude Code**

Run `/help` or check that the skill is listed. The skill should appear as `change-review` with the description from frontmatter.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/change-review/SKILL.md docs/designs/2026-05-06-change-review-design.md docs/designs/2026-05-06-change-review-plan.md
git commit -m "feat: add change-review skill for HTML diff reports"
```

---

### Self-review

**Spec coverage check:**
- [x] Diff range with default and optional arg → Step 1
- [x] Gather changes via git diff → Step 2
- [x] AI-generated overall summary → Step 4
- [x] Per-file explanations → Step 4
- [x] Skip generated/trivial files → Step 3
- [x] Route inference from changed files → Step 5
- [x] Component → page grep → Step 5 rules
- [x] Ensure dev server running, start with `make dev` if not → Step 6
- [x] Playwright screenshots, best-effort → Step 7
- [x] Self-contained HTML with inline CSS/images → Step 8
- [x] Dark theme, #16212B, JetBrains Mono → Step 8 CSS
- [x] Collapsible diffs → Step 8 `<details>` elements
- [x] Click-to-expand screenshots → Step 8 JS
- [x] Output to `.claude/reviews/<branch>-<timestamp>.html` → Step 8
- [x] Auto-open in browser → Step 9
- [x] `.claude/reviews/` gitignored → already covered by `.claude/` in `.gitignore`
- [x] Iron Axe fallback for item page → Step 5 table
- [x] Traits page included → Step 5 table (was missing from design, added)

**Placeholder scan:** No TBDs, TODOs, or vague steps. All code is concrete.

**Type consistency:** N/A — single file, no types to track.
