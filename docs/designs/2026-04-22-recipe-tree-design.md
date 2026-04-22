# Recipe Tree — Design

Status: **design approved, pre-implementation** · Last updated 2026-04-22

## Goal

Ship a real website that lets users browse Soulmask items and visualize how each item is crafted from raw materials (ingredient tree) and what it's used to craft (used-in tree). Data comes from this repo's existing `Game/Parsed/*.json` (2,015 items, 1,109 recipes, 777 tech nodes).

The design is an HTML/React prototype handoff from Claude Design — see `/tmp/soulmask_design/x/soulmask-db/project/Recipe Tree.html` (not committed; bundle ephemeral). This spec ports the prototype's visuals and behavior to a real stack wired to real data.

## Out of scope (for v1)

- English names from modkit PO files (blocked on Windows modkit access).
- Icon assets from modkit (same blocker — hotlinking `soulmaskdatabase.com/images/` for now).
- Drops / loot-source data (parsed but not loaded into DB; separate feature).
- OR-group ingredient extraction from raw BP assets (blocked on modkit access; schema accommodates OR, v1 data has none).
- Sharing/deep-linking OR-alternative selections or quantity multipliers (memory-only).
- Hosting on Fly.io (separate pass once the app runs locally).

## Architecture

```
Game/Parsed/*.json ─┐
                    ├─ pipeline/build_db.py ─▶ data/app.db
translations/*.json ┘                               │
                                                    ▼
                                        ┌─────────────────────┐
                                        │ /backend (Go)       │
                                        │ • sqlc queries      │
                                        │ • /api/graph        │
                                        │ • /api/items/:id    │
                                        │ • /api/search       │
                                        │ • embeds /web/dist  │
                                        └──────────┬──────────┘
                                                   │ HTTP
                                                   ▼
                                        ┌─────────────────────┐
                                        │ /web  React SPA     │
                                        │ • Vite + TS         │
                                        │ • Tailwind          │
                                        │ • Zustand           │
                                        │ • react-router      │
                                        └─────────────────────┘
```

Single Go binary embeds the Vite `dist/`. `/api/*` served from Go; any other path serves the SPA (`index.html` fallback so deep links work).

## Repo layout

```
/pipeline/                     (existing Python, unchanged except:)
  build_db.py                    NEW — loads parsed JSON + translations into SQLite
  generate_translations.py       NEW — emits yaml batch of items needing translation

/backend/                      (new — Go)
  cmd/server/main.go
  go.mod / go.sum
  sqlc.yaml
  internal/
    db/
      schema.sql
      queries.sql
      gen/                       sqlc-generated, committed
    graph/build.go
    api/{router,handlers}.go
    spa/embed.go

/web/                          (new — React+Vite+TS)
  package.json  vite.config.ts  tailwind.config.ts  tsconfig.json
  index.html
  src/
    main.tsx  App.tsx
    pages/{Home,Item}.tsx
    components/{TopNav,Sidebar,ItemHeader,TreeView,FlowView,UsedIn*,RawMats*}.tsx
    store/index.ts               Zustand
    lib/{graph,api}.ts           pure functions over Graph
    styles/{globals,components}.css
  dist/                          gitignored; built into Go binary

/data/                         (new)
  app.db                         gitignored; built by pipeline
  translations/
    manual.json                  Claude-generated subset; committed
    po.json                      stub; filled when modkit accessible

/docs/designs/                 (this file)

Makefile                       (new — wires dev / build / gen)
```

## Data model (SQLite)

Schema lives in `backend/internal/db/schema.sql` and is the single source of truth. `build_db.py` reads and applies it on rebuild. Applied at startup with `CREATE IF NOT EXISTS` (swap to goose migrations post-launch).

```sql
CREATE TABLE items (
  id              TEXT PRIMARY KEY,
  category        TEXT,
  subcategory     TEXT,
  name_zh         TEXT,
  name_en         TEXT,
  description_zh  TEXT,
  weight          REAL,
  max_stack       INTEGER,
  durability      INTEGER,
  icon_path       TEXT,
  is_raw          INTEGER NOT NULL,
  stats_json      TEXT
);

CREATE TABLE stations (
  id       TEXT PRIMARY KEY,
  name_zh  TEXT,
  name_en  TEXT
);

CREATE TABLE recipes (
  id                  TEXT PRIMARY KEY,
  output_item_id      TEXT NOT NULL REFERENCES items(id),
  output_qty          INTEGER NOT NULL DEFAULT 1,
  station_id          TEXT REFERENCES stations(id),
  can_make_by_hand    INTEGER,
  craft_time_seconds  REAL,
  proficiency         TEXT,
  proficiency_xp      REAL,
  recipe_level        INTEGER
);

-- A recipe has 1..N input groups. `kind='all'` means every item required;
-- `kind='one_of'` means pick one (OR group). v1 imports always produce one
-- 'all' group per recipe; 'one_of' arrives when OR extraction lands.
CREATE TABLE recipe_input_groups (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id    TEXT NOT NULL REFERENCES recipes(id),
  group_index  INTEGER NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('all','one_of'))
);

CREATE TABLE recipe_input_group_items (
  group_id   INTEGER NOT NULL REFERENCES recipe_input_groups(id),
  item_id    TEXT NOT NULL REFERENCES items(id),
  quantity   INTEGER NOT NULL,
  PRIMARY KEY (group_id, item_id)
);
CREATE INDEX idx_rigi_item ON recipe_input_group_items(item_id);

CREATE TABLE tech_nodes (
  id                   TEXT PRIMARY KEY,
  category             TEXT,
  name_zh              TEXT,
  name_en              TEXT,
  description_zh       TEXT,
  required_mask_level  INTEGER,
  consume_points       INTEGER,
  parent_id            TEXT REFERENCES tech_nodes(id),
  icon_path            TEXT
);

CREATE TABLE tech_node_unlocks_recipe (
  tech_node_id  TEXT NOT NULL REFERENCES tech_nodes(id),
  recipe_id     TEXT NOT NULL REFERENCES recipes(id),
  PRIMARY KEY (tech_node_id, recipe_id)
);

CREATE TABLE translations (
  key     TEXT PRIMARY KEY,   -- 'item:Daoju_Item_Wood' | 'station:<id>' | 'proficiency:<id>' | 'tech_node:<id>' | 'category:<id>'
  en      TEXT NOT NULL,
  source  TEXT NOT NULL       -- 'manual' | 'po' | 'bp_prettify'
);
```

Translation application during `build_db.py`: `UPDATE items SET name_en = t.en FROM translations t WHERE t.key='item:'||items.id`. `po.json` applied first (authoritative), then `manual.json` fills nulls.

## API

```
GET /api/graph                      → { items, recipes, stations }  (compact; ~200 KB gz)
GET /api/items/:id                  → full item detail
GET /api/search?q=…&limit=50        → [{ id, name_en, name_zh, category }]
                                      SQL: LIKE '%q%' on name_en OR name_zh, ordered by exact-prefix first.
                                      If perf becomes an issue post-launch, migrate to SQLite FTS5 virtual table.
```

Graph payload (short keys intentional):

```json
{
  "items":    [{ "id": "DaoJu_Item_TieDing", "n": "Iron Ingot", "nz": "铁锭",
                 "cat": "processed", "raw": false, "ic": "…" }],
  "recipes":  [{ "id": "BP_PeiFang_PiGe_2", "out": "Daoju_Item_PiGe_2", "outQ": 1,
                 "st": "BP_GongZuoTai_ZhiJiaTai", "t": 10, "prof": "Leatherworking",
                 "groups": [{ "kind": "all", "items": [
                   { "id": "Daoju_Item_Hide", "q": 1 },
                   { "id": "DaoJu_Item_RouZhiYe", "q": 1 }
                 ]}]
               }],
  "stations": [{ "id": "BP_GongZuoTai_ZhiJiaTai", "n": "Leather Workbench" }]
}
```

Cached in-memory on the backend; rebuilt when `data/app.db` mtime changes. ETag via hash of db mtime + row counts. Client caches in `sessionStorage` keyed by ETag.

## Backend (Go)

- Router: `chi`.
- SQLite driver: `modernc.org/sqlite` (pure Go, cross-compiles cleanly).
- Queries: `sqlc` → `internal/db/gen/`. Generated code committed.
- Logging: `zerolog` — root logger in `main.go`, passed via context.
- Config: stdlib `flag` + envvars: `DB_PATH`, `LISTEN_ADDR`, `DEV_MODE`.
- Dev mode: `-dev` flag bypasses the embedded SPA and reverse-proxies non-`/api/*` to `http://localhost:5173` (Vite) for HMR.
- Graph cache: `internal/graph` builds once per db-mtime, returns the JSON bytes directly (no re-marshaling per request).
- SPA embed: `//go:embed dist/*` from inside `internal/spa/`. `go:embed` can't reach across module boundaries, so the Makefile's `build` target copies `web/dist/` → `backend/internal/spa/dist/` before `go build`. The `dist/` directory inside `spa/` is gitignored; only built artifacts land there.
- Any request not matching a file under `dist/` and not starting with `/api/` returns `dist/index.html` (SPA fallback for deep links).
- DB open semantics: backend opens `data/app.db` **read-only** at startup and errors out if the file is missing or unreadable. The DB is owned by `pipeline/build_db.py`; the backend never writes to it.

Expected sqlc queries (≈10): `GetItem`, `ListItems`, `SearchItems`, `ListRecipes`, `GetRecipeInputs`, `ListStations`, `GetItemDetail` (item + unlocking tech nodes), etc.

## Frontend (React)

- **Stack:** Vite, TypeScript, Tailwind, Zustand, react-router v6.
- **Routes:**
  - `/` — Homepage. Placeholder component for v1 (logo + short blurb + link to a featured item). Content designed later.
  - `/item/:id?view=tree|flow` — item detail. Default `view=flow`.
- **Layout:** topnav + single left sidebar + main. No right sidebar.
- **Sidebar (dual-mode):**
  - Default: last 20 items the user viewed (session-scoped; `sessionStorage`-persisted; newest on top; currently-viewed highlighted).
  - Search-mode: when the search input has text, list swaps to `/api/search` results (debounced 150 ms). Clearing the input reverts to history.
  - Browser back/forward handles navigation history; no custom back/forward buttons.
- **Main panel (ports prototype):**
  - `ItemHeader`: gold-bordered diamond icon, Cinzel title, station/time/proficiency badges.
  - `QtyControl`: +/− multiplier (memory-only; no URL persistence).
  - Ingredients section: `TreeView` or `FlowView` based on `?view=`.
  - `RawMatsCollapsible`: aggregated shopping list; updates with qty and OR selections.
  - Used-in section: `UsedInTreeView` or `UsedInFlowView`.
- **View toggle:** in topnav; writes to `?view=` query param (shareable).
- **OR selections:** memory-only, scoped to current page; reset on item navigation.
- **Graph state:** loaded once via `/api/graph`, kept in Zustand, persisted to `sessionStorage` keyed by ETag. Full payload small enough that all tree/flow/used-in/raw-mats computation runs client-side with no per-click round-trips.
- **Graph helpers in `src/lib/graph.ts`:** pure functions `buildIngredientTree`, `buildUsedInIndex`, `buildUsedInTree`, `computeRawMats`. Memoized via `useMemo` in components.

### Tailwind migration

Port the prototype's CSS in this order:

1. **Palette → `tailwind.config.ts` theme.extend.colors** — CSS vars (`--bg`, `--gold`, `--jade`, `--raw`, `--or`, `--text`, `--text-muted`, etc.) become semantic Tailwind colors (`bg-bg`, `text-gold`, `border-jade-border`, …). Fonts (`Cinzel`, `Inter`) via `fontFamily.display` and `fontFamily.sans`.
2. **Component styles → utility classes.** Most prototype rules are 2–5 props; they translate cleanly.
3. **Exceptions kept in `src/styles/components.css` via `@apply`:**
   - `.diamond` — rotate-45 + inner counter-rotate wrapper for nodes.
   - `.flow-connector` — the pseudo-element L-shaped connector lines in flow view.
   - `.or-connector` — the short horizontal tick joining an OR box to its parent.
   - Custom scrollbar styling.
4. **No CSS-in-JS, no shadcn, no component library.** Just utilities + the handful of `@apply` blocks above.

### State store shape (Zustand)

```ts
interface Store {
  graph: Graph | null;
  graphStatus: 'idle' | 'loading' | 'ready' | 'error';
  graphEtag: string | null;
  loadGraph: () => Promise<void>;

  recentVisits: string[];              // item ids, newest first, capped at 20
  pushVisit: (id: string) => void;

  orSel: Record<string, number>;       // key 'recipeId:groupIdx' → chosen alt index
  setOrSel: (key: string, idx: number) => void;
  resetOrSel: () => void;              // called on item navigation

  quantity: number;
  setQuantity: (n: number) => void;
}
```

`viewMode` lives in the URL (not the store); read via `useSearchParams`.

## Pipeline + translations

### `pipeline/build_db.py`

Idempotent rebuild. Reads `backend/internal/db/schema.sql` as the schema source. Steps:

1. Delete `data/app.db` if present; create from schema.
2. Load `Game/Parsed/items.json` → `items`. Compute `is_raw = NOT EXISTS recipe with output=this.id`.
3. Derive `stations` from distinct `(station_id, station_name)` seen in recipes.
4. Load recipes → `recipes` + one `recipe_input_groups` row with `kind='all'` + `recipe_input_group_items` rows.
5. Load `tech_tree.json` → `tech_nodes` + `tech_node_unlocks_recipe`.
6. Load `data/translations/po.json` into `translations` with `source='po'`.
7. Load `data/translations/manual.json` into `translations` with `source='manual'`, skipping keys already present from PO.
8. Fall back to `bp_prettify`: for any item/station without a translation, derive a prettified name from its BP id (strip `BP_`, `DaoJu_Item_`, replace `_` with space, title-case) and insert with `source='bp_prettify'`.
9. Apply translations: `UPDATE items SET name_en = (SELECT en FROM translations WHERE key='item:'||id)`; same for stations and tech_nodes.
10. `VACUUM`.

### `pipeline/generate_translations.py`

Computes the translation target set and emits an editable YAML batch:

- Target set: all item ids appearing as a recipe input or output; all station ids; all proficiency strings; all tech node ids.
- Output: `tasks/translate_batch.yaml` with one row per untranslated key, including `id`, `name_zh`, and a `hint` (BP path segments for context).
- Does not mutate `data/translations/manual.json`.

### Translation as a Claude task

The actual translation happens in-chat (not automated):

1. Run `generate_translations.py` → `tasks/translate_batch.yaml`.
2. Open the yaml in a Claude session, translate using game context + BP-id hints, write the results to `data/translations/manual.json`.
3. Rerun `build_db.py` → English names populate.
4. Commit the updated `manual.json`.

Re-running `generate_translations.py` never overwrites entries already present in `manual.json` — only flags new items (e.g. after a game update that added recipes).

### Future: real PO translations

When modkit access is restored, `parse_localization.py` is extended to emit `data/translations/po.json` instead of the in-memory dict it currently builds. `build_db.py` already prefers PO over manual, so the swap is zero-config.

### Future: OR groups

`parse_recipes.py` is extended with OR-aware property probes (candidates: `AltDemandDaoJu`, `OrDemandDaoJu` — exact names TBD via modkit probing). Recipe JSON gains an `or_inputs` field; `build_db.py` splits it into `kind='one_of'` groups alongside the existing `kind='all'` group. Schema, API, and frontend need no changes — UI already renders `kind='one_of'` groups.

## Dev / build

`Makefile` targets:

```
make dev          # starts backend (:8080, -dev flag) and web (vite :5173) together
make build        # pnpm build → go build, single binary in ./bin/server
make db           # python3 pipeline/build_db.py
make sqlc         # sqlc generate
make translate    # python3 pipeline/generate_translations.py
```

Local run: `make db && make dev`, open `http://localhost:5173`.

## Implementation phases

Tentative — exact ordering/decomposition decided by writing-plans in the next step:

1. **Scaffolding** — repo dirs, Go module, Vite app, Tailwind config, Makefile, empty commit targets.
2. **DB + pipeline** — schema.sql, `build_db.py`, verify `app.db` populates correctly.
3. **Translations** — `generate_translations.py`, first batch of Claude translations, `manual.json` committed.
4. **Backend API** — sqlc queries, `/api/graph`, `/api/items/:id`, `/api/search`; integration test against real db.
5. **Frontend scaffolding** — routes, Tailwind theme, Zustand store, graph loader.
6. **Item detail + Tree view** — full ingredient tree, qty control, raw-mats rollup.
7. **Flow view** — diamond nodes, connecting lines.
8. **Used-in (tree + flow)** — upstream traversal.
9. **Sidebar** — history + search modes.
10. **Homepage placeholder, polish, visual QA against prototype.**

## Open follow-ups (not blockers)

- Homepage content (landing page copy/featured items).
- OR-group extraction from BP assets (modkit-access blocker).
- Real localization via PO files (modkit-access blocker).
- Self-hosted item icons (modkit-access blocker).
- Fly.io deploy pass.
- Drops / loot-source integration (separate feature).
- Goose migrations when schema starts evolving post-launch.
- URL-persisted OR selections / quantity if users ask for sharable builds.
