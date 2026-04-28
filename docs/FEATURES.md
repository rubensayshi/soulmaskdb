# Features

Detailed inventory of every user-facing feature. For route/component mapping see the source files linked in each section.

## Layout and navigation

**Top nav** (`web/src/components/TopNav.tsx`)
- Logo links home. Four tabs: Recipes, Tech Tree, Awareness XP, Food Almanac.
- "Recipes" tab links to the most recently viewed item (falls back to Iron Ingot).
- Active tab has a green underline indicator.

**Sidebar** (`web/src/components/Sidebar.tsx`)
- Persistent left panel (264 px) on all pages.
- **Search**: debounced (150 ms) API call to `GET /api/search?q=`. Results ranked prefix-first. Supports English name, Chinese name, and blueprint ID.
- **Recent visits**: session-stored list of the last 20 viewed items, shown when search is empty.
- Each row shows an icon, name, category, and a colored dot (green = craftable, rust = raw material).
- Active item highlighted with green left border + gradient.

**Tweaks panel** (`web/src/components/TweaksPanel.tsx`)
- Floating gear button (bottom-right corner).
- Currently one toggle: show/hide the raw materials gathering checklist on item pages.
- State persisted in localStorage.

## Home page

**Route**: `/` | **Source**: `web/src/pages/Home.tsx`

- **Hero section**: dark background with decorative mask SVG, tagline, and description.
- **Stats strip**: live counts of recipes, items, stations, and categories pulled from the graph.
- **Featured chains**: four hand-picked items (Iron Ingot, Iron Axe, Premium Leather, Steel Ingot) with blurbs, linking to their item pages. Only shown if present in the DB.
- **Changelog**: array of `{type: 'feat'|'fix', text}` entries rendered as badges. Updated manually when a change is user-visible.

## Item detail page

**Route**: `/item/:id` (accepts slug or blueprint ID) | **Source**: `web/src/pages/Item.tsx`

The richest page. Sections render conditionally based on available data.

### Item header
(`web/src/components/ItemHeader.tsx`)
- Icon, English/Chinese name, category/subcategory, role badge.
- Weight, durability, max stack if present.
- Crafting station and craft time from the primary recipe.

### Quality selector and stats
(`web/src/components/QualitySelector.tsx`, `web/src/components/ItemStats.tsx`)
- Six quality tiers (Normal through Legendary), each with a color.
- Selecting a tier multiplies base stats by per-tier quality scaling factors (`qlo`/`qhi` ranges).
- Stats displayed in a two-column grid. Percentage vs flat formatting is per-attribute.
- Stat names translated from Chinese property names to English labels (e.g. `WuQiDamage` → "Weapon Damage").

### Crafting flow tree
(`web/src/components/FlowView.tsx`)
- Recursive tree visualization: root item at top, ingredients branching downward.
- Diamond-shaped nodes with icons. Root node is larger; raw materials use a "raw" variant.
- **Or-groups**: when a recipe accepts alternative ingredients ("choose one"), shown as a teal panel listing options. Click to select; badge shows count when collapsed.
- **Quantity multiplier**: respects the global quantity setting (from tweaks).
- Max recursion depth of 6 to prevent infinite loops.
- Auto-centers scroll position on load.

### Raw materials checklist
(`web/src/components/RawMats.tsx`)
- Collapsible section listing all leaf-node (raw) materials needed for the full crafting chain.
- Quantities account for the selected or-group alternatives and the quantity multiplier.
- Toggled via the tweaks panel or the cart icon in the section header.

### Used in
(`web/src/components/UsedIn.tsx`)
- Two sections: "Used in Final Items" and "Used in Intermediate Components".
- Category filter pills when multiple categories exist (e.g. weapon, tool, structure).
- Each row links to the output item.

### Tech tree unlocks
(`web/src/components/TechUnlock.tsx`)
- Lists which tech tree nodes unlock the recipes that craft this item.
- Shows node name, required mask (awareness) level, and parent node name.
- Links to the tech tree page filtered to that node.

### Drop sources
(`web/src/components/ObtainedFrom.tsx`)
- Table of creatures, chests, or gathering nodes that drop this item.
- Columns: source name, source type, probability, quantity range.
- Filterable by source type (creature/chest/gathering). Collapsible with `maxRows`.

### Spawn map
(`web/src/components/SpawnMap.tsx`)
- Leaflet map rendering spawn locations on the game world map.
- Two maps supported: Cloud & Mist (base) and Shifting Sands (DLC). Tab switcher when both have data.
- Color-coded circle markers per creature type with level-range tooltips.
- Legend below the map shows creature, level range, and spawn count.
- Map preference (which map tab) persisted in localStorage.
- When spawn data exists, the header layout switches to a side-by-side view (item info left, map right).

### Seed farming
(`web/src/components/SeedSources.tsx`)
- **Farming stats card**: grindable status, fertilizer type, growth/optimal temperature ranges.
- **Acquisition sources**: list of ways to obtain the seed (gathering, drops, purchase) with locations and notes.

### SEO
- Per-item `<title>`, `<meta description>`, canonical URL, Open Graph and Twitter meta.
- JSON-LD `Product` schema with name, description, URL, and category.

## Tech tree page

**Route**: `/tech-tree` and `/tech-tree/:slug` | **Source**: `web/src/pages/TechTree.tsx`

### Mode switching
- Three modes: Survival, Soldier, Management. Each loads different tech node categories from the API.

### Tier layout
(`web/src/components/TechTier.tsx`)
- Nodes organized by bonfire tier (Campfire → Bonfire → Bronze Pit → Black Iron Pit → Steel Pit → Fine Steel Pit).
- Each tier is a column with a header showing tier name and required awareness level.
- Nodes split into left (no intra-tier prerequisite) and right (depends on another node in the same tier).

### Dependency lines
- SVG bezier curves connecting prerequisite nodes across tiers.
- Lines recompute on scroll, resize, expand/collapse, and search filter changes.
- Hovering a node highlights its direct dependency lines and dims unrelated ones.

### Node cards
(`web/src/components/TechNode.tsx`, `web/src/components/TechSubNode.tsx`)
- Click to expand, showing sub-nodes and their unlocked recipes.
- Recipe cards (`web/src/components/TechRecipeCard.tsx`) show item icon, name, and link to the item page.

### Search
- Text input filters nodes by English or Chinese name (including sub-node names).
- Non-matching tiers dim to 20% opacity.

### Deep linking
- `/tech-tree/:slug` auto-expands and scrolls to the matching node on load.

### Untiered section
- Nodes with no bonfire prerequisite shown in a separate panel below the main tree.

## Awareness XP page

**Route**: `/awareness-xp` | **Source**: `web/src/pages/AwarenessXp.tsx`

- Recipes ranked by awareness XP per minute of craft time (descending).
- Columns: item name, XP/min, total XP, craft time, tier, skill.
- **Filters** (combinable):
  - Tier: Stone, Bone, Bronze, Iron, Steel (mapped from required mask level ranges).
  - Skill: 11 crafting proficiencies (Alchemy, Cooking, Weapon Crafting, etc.).
  - Type: Final or Intermediate items.
- Each row links to the item's detail page.
- Shows filtered/total counts.

## Food almanac page

**Route**: `/food-almanac` | **Source**: `web/src/pages/FoodAlmanac.tsx`

- Tabbed comparison table of every food, drink, and potion with buff data.
- **Five categories**: Meat (HP/healing), Fruit & Veg (stamina/speed), Staple Food (carry weight/defense), Recreative (drinks/tobacco/misc), Potions (burst/cure/cleanse).
- Items classified by preference attributes (`meat_preference`, `fruit_preference`, `staple_preference`) or potion category.

### Table features
- **Tier badges**: Top (30+ min duration), Mid (20–29 min), Basic (< 20 min).
- **Dynamic columns**: generated per-category from which buff attributes items actually have. Sorted by frequency.
- **Companion preference**: shown as a gold-colored column for meat/fruit/staple categories.
- **Sort controls**: by tier, duration, or any individual buff column.
- **Value formatting**: additive buffs as `+N`, multiplicative as `+N%`, overrides as `=N`.
- **Proportional bars**: 2 px colored bars under each value showing relative magnitude within the column.
- Row hover highlights in the category's accent color.
- Each item links to its detail page.

## API endpoints

All under `/api`, served by `backend/internal/api/router.go`.

| Endpoint             | Handler           | Purpose                                                        |
| -------------------- | ----------------- | -------------------------------------------------------------- |
| `GET /api/graph`     | `handleGraph`     | Full crafting graph (items + recipes + stations). ETag caching. |
| `GET /api/items/:id` | `handleItem`      | Item detail with recipes, drops, tech unlocks, seeds, spawns.  |
| `GET /api/search`    | `handleSearch`    | Substring search on name_en/name_zh. Prefix matches ranked first. |
| `GET /api/food-buffs`| `handleFoodBuffs` | All items with buff data (food/drink/potion).                  |
| `GET /api/tech-tree` | `handleTechTree`  | Tech tree nodes with tier grouping. `?mode=survival\|soldier\|management`. |
| `GET /sitemap.xml`   | `HandleSitemap`   | XML sitemap with all item pages + static pages.                |

### Graph caching
- `/api/graph` uses an in-memory cache keyed on `data/app.db` mtime.
- Returns `304 Not Modified` when client sends matching `If-None-Match` ETag.
- Client caches the graph in sessionStorage to avoid re-fetching on page navigation.

## Client-side state

Zustand store (`web/src/store/index.ts`):

| State           | Storage        | Purpose                                         |
| --------------- | -------------- | ----------------------------------------------- |
| `graph`         | sessionStorage | Cached crafting graph from `/api/graph`          |
| `graphEtag`     | sessionStorage | ETag for conditional graph fetches               |
| `recentVisits`  | sessionStorage | Last 20 viewed item IDs                          |
| `orSel`         | localStorage   | User's or-group selections (recipe alternatives) |
| `tweaks`        | localStorage   | UI preferences (show raw materials, quantity)    |
| `tweaksOpen`    | localStorage   | Whether tweaks panel is expanded                 |
