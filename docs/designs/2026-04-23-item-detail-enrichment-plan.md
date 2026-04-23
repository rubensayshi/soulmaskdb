# Item Detail Enrichment Implementation Plan

**Goal:** Add descriptions, stats, drop sources, and tech tree unlock info to the item detail page.

**Architecture:** Enrich the graph payload with lightweight item metadata (description, weight, durability, stats). Add new DB tables for drop sources, served via the existing `/api/items/{id}` detail endpoint. Frontend fetches detail on-demand for drop data, uses graph data for everything else.

**Tech Stack:** Python (build_db.py), Go + sqlc (backend), React + TypeScript (frontend), SQLite.

---

## File Map

| File | Action | Responsibility |
| ---- | ------ | -------------- |
| `data/translations/stat_attrs.json` | Create | Pinyin stat attr → English map |
| `data/translations/creature_names.json` | Create | Bag name stem → English creature name |
| `backend/internal/db/schema.sql` | Modify | Add `drop_sources` + `drop_source_items` tables |
| `backend/internal/db/queries.sql` | Modify | Add drop queries, widen graph item query |
| `backend/internal/db/gen/*` | Regenerate | sqlc output |
| `pipeline/build_db.py` | Modify | Import drops.json into new tables |
| `backend/internal/graph/build.go` | Modify | Add desc, weight, durability, stats to graph Item |
| `backend/internal/api/items.go` | Modify | Add drop sources + tech node details to response |
| `web/src/lib/types.ts` | Modify | Add new fields to Item, add ItemDetail type |
| `web/src/lib/api.ts` | Modify | Add `fetchItemDetail()` |
| `web/src/components/ItemHeader.tsx` | Modify | Show description, weight, durability |
| `web/src/components/ItemStats.tsx` | Create | Stat attribute table |
| `web/src/components/ObtainedFrom.tsx` | Create | Drop source list |
| `web/src/components/TechUnlock.tsx` | Create | Tech node unlock badge |
| `web/src/pages/Item.tsx` | Modify | Wire new components, fetch detail |

---

### Task 1: Translation Data Files

**Files:**
- Create: `data/translations/stat_attrs.json`
- Create: `data/translations/creature_names.json`

- [ ] **Step 1: Create stat attribute translation map**

Create `data/translations/stat_attrs.json`:

```json
{
  "Attack": "Attack",
  "Defense": "Defense",
  "Crit": "Critical Chance",
  "CritDamageInc": "Critical Damage",
  "CritDef": "Critical Defense",
  "MaxHealth": "Max Health",
  "HealthRecover": "Health Regen",
  "MaxTiLi": "Max Stamina",
  "TiLiRecover": "Stamina Regen",
  "TiLiWakenJianMian": "Stamina Reduction",
  "MaxFood": "Max Food",
  "MaxWater": "Max Water",
  "MaxFuZhong": "Max Carry Weight",
  "SpeedRate": "Movement Speed",
  "WuQiDamage": "Weapon Damage",
  "WuQiDamageInc": "Weapon Damage Bonus",
  "WuQiDamageDec": "Weapon Damage Taken",
  "WuQiDamageIncAgainstDun": "Damage vs Shields",
  "WuQiDunDamageDec": "Shield Damage Taken",
  "WuQiEventMagnitude": "Weapon Effect Power",
  "DamageDec": "Damage Reduction",
  "BlockWeakenTenacityDefense": "Block Tenacity",
  "BaTi": "Poise",
  "ShengYinRatio": "Noise Level",
  "WenDuBaoNuan": "Cold Insulation",
  "WenDuSanRe": "Heat Dissipation",
  "WenDuAdd": "Temperature Bonus",
  "YinBiValue": "Stealth",
  "HanKang": "Cold Resistance",
  "YanKang": "Heat Resistance",
  "FuKang": "Corrosion Resistance",
  "DuKang": "Poison Resistance",
  "ZhuangBeiFangDu": "Equipment Poison Def",
  "ZhuangBeiFangFuShe": "Equipment Radiation Def",
  "BleedingDamageCarried": "Bleed Damage",
  "ParalysisDamageCarried": "Paralysis Damage",
  "FallSleepDamageCarried": "Sleep Damage",
  "FallDamageDec": "Fall Damage Reduction",
  "HeadMaxHP": "Head Max HP",
  "BodyMaxHP": "Body Max HP",
  "LeftArmMaxHP": "Left Arm Max HP",
  "LeftLegMaxHP": "Left Leg Max HP"
}
```

- [ ] **Step 2: Create creature name translation map**

Create `data/translations/creature_names.json`. Keys are normalized bag name stems (after stripping `DL_` prefix). Values are English names.

```json
{
  "YeZhu": "Boar",
  "XiaoYeZhu": "Small Boar",
  "Eyu": "Alligator",
  "EYu": "Alligator",
  "DaXiang": "Elephant",
  "Xiong": "Black Bear",
  "ZongXiong": "Brown Bear",
  "Lang": "Grey Wolf",
  "ZongLang": "Alpha Wolf",
  "XueLang": "Arctic Wolf",
  "BaoZi": "Jaguar",
  "XueBao": "Snow Leopard",
  "ShiZi": "Lion",
  "XiongLu": "Moose",
  "Lu": "Deer",
  "MuLu": "Stag",
  "Ma": "Horse",
  "YangTuo": "Alpaca",
  "DaYangTuo": "Large Alpaca",
  "TuoNiao": "Ostrich",
  "TuoLu": "Camel",
  "Chicken": "Chicken",
  "HuoJi": "Turkey",
  "LaoShu": "Rat",
  "BianFu": "Bat",
  "HouZi": "Monkey",
  "WuGong": "Centipede",
  "ZhiZhu": "Spider",
  "ZhangYu": "Octopus",
  "JiaoDiao": "Pterodactyl",
  "MengMa": "Mammoth",
  "MengMaXiang": "Mammoth Elephant",
  "ShiRenChang": "Piranha",
  "ShuiTun": "Manatee",
  "QiuYu": "Fish",
  "QiuYuXi": "Lobster",
  "Yu": "Fish",
  "HaiGuai": "Sea Monster",
  "SenRan": "Forest Lizard",
  "JuXi": "Giant Lizard",
  "XiNiu": "Rhinoceros",
  "YeNiu": "Wild Bull",
  "JianDuWa": "Poison Frog",
  "DuJianWa": "Dart Frog",
  "MoGuiWa": "Devil Frog",
  "JianChiHu": "Sabertooth Tiger",
  "TuJiu": "Vulture",
  "XiangGui": "Tortoise",
  "SouQuan": "Hyena",
  "JuFengJiu": "Giant Hornet",
  "HanTa": "Cobra",
  "Cobra": "Cobra",
  "JinGangYuan": "Gorilla",
  "Cat": "Cat",
  "Aardvark": "Aardvark",
  "Baboon": "Baboon",
  "Behemoth": "Behemoth",
  "Dromedary": "Dromedary",
  "Falcon": "Falcon",
  "Fennec": "Fennec Fox",
  "Flamingo": "Flamingo",
  "Hippopotamus": "Hippopotamus",
  "HoneyBadger": "Honey Badger",
  "LieGou": "Hunting Dog",
  "Scarab": "Scarab",
  "SacredLbis": "Sacred Ibis",
  "YingWu": "Parrot",
  "DianMan": "Electric Eel",
  "Sobeck": "Sobek",
  "JackalKing": "Jackal King",
  "ChaJiaoLin": "Pangolin",
  "JCH_YaChi": "Jaw Fossil"
}
```

- [ ] **Step 3: Commit**

```bash
git add data/translations/stat_attrs.json data/translations/creature_names.json
git commit -m "feat: add stat attribute and creature name translation maps"
```

---

### Task 2: DB Schema — Drop Source Tables

**Files:**
- Modify: `backend/internal/db/schema.sql`

- [ ] **Step 1: Add drop source tables to schema**

Append to `backend/internal/db/schema.sql` after the `translations` table:

```sql
CREATE TABLE drop_sources (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  bag_name    TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL,
  source_name TEXT
);

CREATE TABLE drop_source_items (
  source_id   INTEGER NOT NULL REFERENCES drop_sources(id),
  item_id     TEXT NOT NULL,
  probability INTEGER NOT NULL,
  qty_min     INTEGER NOT NULL DEFAULT 1,
  qty_max     INTEGER NOT NULL DEFAULT 1,
  weight      INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_dsi_item ON drop_source_items(item_id);
```

- [ ] **Step 2: Commit**

```bash
git add backend/internal/db/schema.sql
git commit -m "feat: add drop_sources and drop_source_items tables to schema"
```

---

### Task 3: Pipeline — Import Drops into DB

**Files:**
- Modify: `pipeline/build_db.py`

- [ ] **Step 1: Add drop import logic to build_db.py**

After the translations section (~line 229), before `db.commit()`, add drop import. The logic:

1. Load `drops.json` and `creature_names.json`
2. For each drop table entry, insert into `drop_sources` with a translated `source_name`
3. For each item in each group, extract the item_id from `item_ref` using a regex, and if it exists in `item_ids`, insert into `drop_source_items`

Creature name resolution: strip `DL_` prefix from bag_name, then try progressively shorter prefixes against the creature_names map. For `Hunt_*` bags, strip `Hunt_` and any trailing `_Elite`/`_` then look up. Fall back to prettified bag name.

```python
# --- drops ---
drops = load_json(PARSED / "drops.json")
creature_names = json.loads((TRANSLATIONS / "creature_names.json").read_text(encoding="utf-8"))

def resolve_creature_name(bag_name, source_type):
    """Derive a human-readable source name from bag_name."""
    stem = re.sub(r'^DL_', '', bag_name)
    # Strip common suffixes
    clean = re.sub(r'(_Extra|Elite_Extra)$', '', stem)
    clean = re.sub(r'Elite$', '', clean)
    clean = re.sub(r'_JY$', '', clean)
    # Hunt bags: Hunt_EYu_Elite -> EYu
    hunt_match = re.match(r'Hunt_(?:Egypt_)?(.+?)(?:_Elite|_)?$', clean)
    if hunt_match:
        clean = hunt_match.group(1)
    # Try lookup
    if clean in creature_names:
        return creature_names[clean]
    # Try without trailing _
    clean2 = clean.rstrip('_')
    if clean2 in creature_names:
        return creature_names[clean2]
    return prettify_bp_id(bag_name)

def extract_item_id_from_ref(ref):
    """Extract item ID from UE BlueprintGeneratedClass path."""
    m = re.search(r'/([^/]+)\.[^/\"]+_C', ref)
    return m.group(1) if m else None

drop_source_count = 0
drop_item_count = 0
for d in drops:
    source_name = resolve_creature_name(d["bag_name"], d["source_type"])
    cur = db.execute(
        "INSERT INTO drop_sources (bag_name, source_type, source_name) VALUES (?,?,?)",
        (d["bag_name"], d["source_type"], source_name),
    )
    source_id = cur.lastrowid
    drop_source_count += 1
    for g in d.get("groups", []):
        prob = g.get("probability", 100)
        for item in g.get("items", []):
            extracted_id = extract_item_id_from_ref(item.get("item_ref", ""))
            if extracted_id and extracted_id in item_ids:
                db.execute(
                    "INSERT INTO drop_source_items (source_id, item_id, probability, qty_min, qty_max, weight) "
                    "VALUES (?,?,?,?,?,?)",
                    (source_id, extracted_id, prob,
                     item.get("qty_min", 1), item.get("qty_max", 1),
                     item.get("weight", 1)),
                )
                drop_item_count += 1
```

Also update the final print to include drop counts:

```python
print(f"  drop_sources:      {drop_source_count}")
print(f"  drop_items:        {drop_item_count}")
```

- [ ] **Step 2: Rebuild the database**

```bash
python3 pipeline/build_db.py
```

Expected: completes with counts including `drop_sources: 1292`, `drop_items: ~18000+`.

- [ ] **Step 3: Verify drop data in DB**

```bash
sqlite3 data/app.db "SELECT count(*) FROM drop_sources"
sqlite3 data/app.db "SELECT count(*) FROM drop_source_items"
sqlite3 data/app.db "SELECT ds.source_name, ds.source_type, dsi.probability, dsi.qty_min, dsi.qty_max FROM drop_source_items dsi JOIN drop_sources ds ON ds.id = dsi.source_id WHERE dsi.item_id = 'Daoju_Item_EYuPi' LIMIT 5"
```

Expected: Alligator Skin drops showing source_name="Alligator", source_type="creature_body".

- [ ] **Step 4: Commit**

```bash
git add pipeline/build_db.py data/app.db
git commit -m "feat: import drop sources into DB from drops.json"
```

---

### Task 4: Backend — New Queries + Regen sqlc

**Files:**
- Modify: `backend/internal/db/queries.sql`
- Regenerate: `backend/internal/db/gen/*`

- [ ] **Step 1: Widen graph item query to include description, weight, durability, stats**

In `queries.sql`, change `ListItemsForGraph`:

```sql
-- name: ListItemsForGraph :many
SELECT id, name_en, name_zh, category, role, icon_path, slug,
       description_zh, weight, durability, stats_json
FROM items;
```

- [ ] **Step 2: Add drop source queries**

Append to `queries.sql`:

```sql
-- name: GetDropSourcesForItem :many
SELECT ds.source_name, ds.source_type, dsi.probability, dsi.qty_min, dsi.qty_max
FROM drop_source_items dsi
JOIN drop_sources ds ON ds.id = dsi.source_id
WHERE dsi.item_id = ?
ORDER BY ds.source_type, dsi.probability DESC;
```

- [ ] **Step 3: Regenerate sqlc**

```bash
cd backend && sqlc generate
```

Verify no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/internal/db/queries.sql backend/internal/db/gen/
git commit -m "feat: add drop source query and widen graph item query"
```

---

### Task 5: Backend — Graph Enrichment

**Files:**
- Modify: `backend/internal/graph/build.go`

- [ ] **Step 1: Add new fields to graph Item struct**

```go
type Item struct {
	ID       string      `json:"id"`
	S        *string     `json:"s,omitempty"`
	N        *string     `json:"n"`
	NZ       *string     `json:"nz"`
	Cat      *string     `json:"cat"`
	Role     string      `json:"role"`
	IconPath *string     `json:"ic,omitempty"`
	DescZh   *string     `json:"dz,omitempty"`
	Weight   *float64    `json:"w,omitempty"`
	Dur      *int64      `json:"dur,omitempty"`
	Stats    interface{} `json:"stats,omitempty"`
}
```

- [ ] **Step 2: Populate new fields in Build()**

Update the item-building loop to use the widened query results:

```go
for _, r := range itemRows {
    var stats interface{}
    if r.StatsJson.Valid {
        _ = json.Unmarshal([]byte(r.StatsJson.String), &stats)
    }
    items = append(items, Item{
        ID:       r.ID,
        S:        nullable(r.Slug),
        N:        nullable(r.NameEn),
        NZ:       nullable(r.NameZh),
        Cat:      nullable(r.Category),
        Role:     r.Role,
        IconPath: nullable(r.IconPath),
        DescZh:   nullable(r.DescriptionZh),
        Weight:   nullablef(r.Weight),
        Dur:      nullablei(r.Durability),
        Stats:    stats,
    })
}
```

Add `"encoding/json"` to the import block (already present).

- [ ] **Step 3: Build and verify**

```bash
cd backend && go build ./...
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/graph/build.go
git commit -m "feat: add description, weight, durability, stats to graph payload"
```

---

### Task 6: Backend — Item Detail Endpoint Enrichment

**Files:**
- Modify: `backend/internal/api/items.go`

- [ ] **Step 1: Add drop source and tech node structs to ItemDetail**

```go
type DropSource struct {
	SourceName string `json:"source_name"`
	SourceType string `json:"source_type"`
	Probability int64 `json:"probability"`
	QtyMin     int64  `json:"qty_min"`
	QtyMax     int64  `json:"qty_max"`
}

type TechUnlock struct {
	ID              string  `json:"id"`
	NameEn          *string `json:"name_en"`
	NameZh          *string `json:"name_zh"`
	RequiredMaskLevel *int64 `json:"required_mask_level"`
}
```

Update `ItemDetail`:

```go
type ItemDetail struct {
	ID             string       `json:"id"`
	NameEn         *string      `json:"name_en"`
	NameZh         *string      `json:"name_zh"`
	DescriptionZh  *string      `json:"description_zh"`
	Category       *string      `json:"category"`
	Subcategory    *string      `json:"subcategory"`
	Weight         *float64     `json:"weight"`
	MaxStack       *int64       `json:"max_stack"`
	Durability     *int64       `json:"durability"`
	Role           string       `json:"role"`
	IconPath       *string      `json:"icon_path"`
	Stats          interface{}  `json:"stats"`
	TechUnlockedBy []TechUnlock `json:"tech_unlocked_by"`
	RecipesToCraft []string     `json:"recipes_to_craft"`
	RecipesUsedIn  []string     `json:"recipes_used_in"`
	DropSources    []DropSource `json:"drop_sources"`
}
```

- [ ] **Step 2: Update handleItem to populate drop sources and rich tech unlock data**

In `handleItem`, after the existing tech-node loop, add drop source query:

```go
// tech unlocks — now with full details
var techUnlocks []TechUnlock
for _, rec := range toCraft {
    nodes, _ := q.GetTechUnlocksForRecipe(ctx, rec.ID)
    for _, n := range nodes {
        techUnlocks = append(techUnlocks, TechUnlock{
            ID:                n.ID,
            NameEn:            nullStr(n.NameEn),
            NameZh:            nullStr(n.NameZh),
            RequiredMaskLevel: nullInt(n.RequiredMaskLevel),
        })
    }
}

// drop sources
dropRows, _ := q.GetDropSourcesForItem(ctx, item.ID)
dropSources := make([]DropSource, 0, len(dropRows))
for _, d := range dropRows {
    dropSources = append(dropSources, DropSource{
        SourceName:  d.SourceName.String,
        SourceType:  d.SourceType,
        Probability: d.Probability,
        QtyMin:      d.QtyMin,
        QtyMax:      d.QtyMax,
    })
}
```

Update the detail struct construction to use `techUnlocks` and `dropSources`.

- [ ] **Step 3: Build and verify**

```bash
cd backend && go build ./...
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/api/items.go
git commit -m "feat: add drop sources and rich tech unlock data to item detail endpoint"
```

---

### Task 7: Frontend — Types and API

**Files:**
- Modify: `web/src/lib/types.ts`
- Modify: `web/src/lib/api.ts`

- [ ] **Step 1: Extend Item type with new graph fields**

In `types.ts`, add to the `Item` interface:

```typescript
export interface Item {
  id: string
  s?: string | null
  n: string | null
  nz: string | null
  cat: string | null
  role: ItemRole
  ic?: string | null
  dz?: string | null          // description_zh
  w?: number | null            // weight
  dur?: number | null          // durability
  stats?: StatEntry[] | null   // equipment stats
}

export interface StatEntry {
  attr: string
  value: number
  op: string | null
}
```

- [ ] **Step 2: Add ItemDetail type**

```typescript
export interface DropSource {
  source_name: string
  source_type: string
  probability: number
  qty_min: number
  qty_max: number
}

export interface TechUnlock {
  id: string
  name_en: string | null
  name_zh: string | null
  required_mask_level: number | null
}

export interface ItemDetail {
  id: string
  drop_sources: DropSource[]
  tech_unlocked_by: TechUnlock[]
}
```

- [ ] **Step 3: Add fetchItemDetail to api.ts**

```typescript
import type { Graph, BuffedItem, ItemDetail } from './types'

export async function fetchItemDetail(id: string): Promise<ItemDetail> {
  const res = await fetch(`/api/items/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error(`item detail: ${res.status}`)
  return res.json()
}
```

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/types.ts web/src/lib/api.ts
git commit -m "feat: add item detail types and API client"
```

---

### Task 8: Frontend — ItemHeader Description + Weight/Durability

**Files:**
- Modify: `web/src/components/ItemHeader.tsx`

- [ ] **Step 1: Add description and physical stats to ItemHeader**

Below the classification `<div>`, add:

```tsx
{item.dz && (
  <div className="text-[12px] text-text-mute mt-[6px] leading-[1.5] max-w-[600px]">{item.dz}</div>
)}
```

In the stats `<div>` (the `flex flex-wrap gap-[18px]` section), add weight and durability for all items that have them:

```tsx
{item.w != null && <Stat label="Weight" value={`${Math.round(item.w * 100) / 100}`} />}
{item.dur != null && <Stat label="Durability" value={`${item.dur}`} />}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/ItemHeader.tsx
git commit -m "feat: show item description, weight, durability in header"
```

---

### Task 9: Frontend — ItemStats Component

**Files:**
- Create: `web/src/components/ItemStats.tsx`

- [ ] **Step 1: Create ItemStats component**

```tsx
import type { StatEntry } from '../lib/types'

const STAT_NAMES: Record<string, string> = {
  Attack: 'Attack',
  Defense: 'Defense',
  Crit: 'Critical Chance',
  CritDamageInc: 'Critical Damage',
  CritDef: 'Critical Defense',
  MaxHealth: 'Max Health',
  HealthRecover: 'Health Regen',
  MaxTiLi: 'Max Stamina',
  TiLiRecover: 'Stamina Regen',
  TiLiWakenJianMian: 'Stamina Reduction',
  MaxFood: 'Max Food',
  MaxWater: 'Max Water',
  MaxFuZhong: 'Max Carry Weight',
  SpeedRate: 'Movement Speed',
  WuQiDamage: 'Weapon Damage',
  WuQiDamageInc: 'Weapon Damage Bonus',
  WuQiDamageDec: 'Weapon Damage Taken',
  WuQiDamageIncAgainstDun: 'Damage vs Shields',
  WuQiDunDamageDec: 'Shield Damage Taken',
  WuQiEventMagnitude: 'Weapon Effect Power',
  DamageDec: 'Damage Reduction',
  BlockWeakenTenacityDefense: 'Block Tenacity',
  BaTi: 'Poise',
  ShengYinRatio: 'Noise Level',
  WenDuBaoNuan: 'Cold Insulation',
  WenDuSanRe: 'Heat Dissipation',
  WenDuAdd: 'Temperature Bonus',
  YinBiValue: 'Stealth',
  HanKang: 'Cold Resistance',
  YanKang: 'Heat Resistance',
  FuKang: 'Corrosion Resistance',
  DuKang: 'Poison Resistance',
  ZhuangBeiFangDu: 'Equipment Poison Def',
  ZhuangBeiFangFuShe: 'Equipment Radiation Def',
  BleedingDamageCarried: 'Bleed Damage',
  ParalysisDamageCarried: 'Paralysis Damage',
  FallSleepDamageCarried: 'Sleep Damage',
  FallDamageDec: 'Fall Damage Reduction',
  HeadMaxHP: 'Head Max HP',
  BodyMaxHP: 'Body Max HP',
  LeftArmMaxHP: 'Left Arm Max HP',
  LeftLegMaxHP: 'Left Leg Max HP',
}

function formatValue(attr: string, value: number): string {
  if (Math.abs(value) < 1 && value !== 0) {
    return `${value > 0 ? '+' : ''}${Math.round(value * 100)}%`
  }
  const rounded = Math.round(value * 100) / 100
  return `${rounded > 0 ? '+' : ''}${rounded}`
}

interface Props {
  stats: StatEntry[]
}

export default function ItemStats({ stats }: Props) {
  if (!stats.length) return null

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] mb-4">
      {stats.map((s, i) => (
        <div key={i} className="flex items-center justify-between py-[3px] border-b border-hair">
          <span className="text-text-dim">{STAT_NAMES[s.attr] ?? s.attr}</span>
          <span className="font-medium text-text tabular-nums">{formatValue(s.attr, s.value)}</span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/ItemStats.tsx
git commit -m "feat: add ItemStats component with translated attribute names"
```

---

### Task 10: Frontend — ObtainedFrom Component

**Files:**
- Create: `web/src/components/ObtainedFrom.tsx`

- [ ] **Step 1: Create ObtainedFrom component**

```tsx
import type { DropSource } from '../lib/types'

const SOURCE_TYPE_LABELS: Record<string, string> = {
  creature_body: 'Creatures',
  npc: 'NPCs',
  npc_dlc: 'NPCs (DLC)',
  plant: 'Gathering',
  tribe: 'Tribe Chests',
  tribe_dlc: 'Tribe Chests (DLC)',
  ruins: 'Ruins',
  relic_dlc: 'Relics (DLC)',
  item_bag: 'Item Bags',
  underground_city: 'Underground City',
  dungeon_dlc: 'Dungeons (DLC)',
}

interface Props {
  sources: DropSource[]
}

export default function ObtainedFrom({ sources }: Props) {
  if (!sources.length) return null

  // Group by source_type, then deduplicate by source_name (take highest probability)
  const grouped = new Map<string, Map<string, DropSource>>()
  for (const s of sources) {
    if (!grouped.has(s.source_type)) grouped.set(s.source_type, new Map())
    const byName = grouped.get(s.source_type)!
    const existing = byName.get(s.source_name)
    if (!existing || s.probability > existing.probability) {
      byName.set(s.source_name, s)
    }
  }

  const typeOrder = Object.keys(SOURCE_TYPE_LABELS)
  const sortedTypes = [...grouped.keys()].sort(
    (a, b) => (typeOrder.indexOf(a) === -1 ? 999 : typeOrder.indexOf(a)) - (typeOrder.indexOf(b) === -1 ? 999 : typeOrder.indexOf(b))
  )

  return (
    <div className="space-y-3 mb-4">
      {sortedTypes.map(type => {
        const label = SOURCE_TYPE_LABELS[type] ?? type
        const entries = [...grouped.get(type)!.values()].sort((a, b) => b.probability - a.probability)
        return (
          <div key={type}>
            <div className="text-[10px] tracking-[.12em] uppercase text-text-dim font-medium mb-1.5">{label}</div>
            <div className="space-y-0.5">
              {entries.map((s, i) => (
                <div key={i} className="flex items-center gap-3 text-[12px] py-[3px] border-b border-hair">
                  <span className="text-text flex-1">{s.source_name}</span>
                  <span className="text-text-dim tabular-nums w-[50px] text-right">{s.probability}%</span>
                  <span className="text-text-mute tabular-nums w-[60px] text-right">
                    {s.qty_min === s.qty_max ? `×${s.qty_min}` : `×${s.qty_min}–${s.qty_max}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/ObtainedFrom.tsx
git commit -m "feat: add ObtainedFrom component for drop source display"
```

---

### Task 11: Frontend — TechUnlock Component

**Files:**
- Create: `web/src/components/TechUnlock.tsx`

- [ ] **Step 1: Create TechUnlock component**

```tsx
import type { TechUnlock as TechUnlockType } from '../lib/types'

const MASK_TIERS: Record<number, string> = {
  1: 'Stone',
  2: 'Bone',
  3: 'Bronze',
  4: 'Iron',
  5: 'Steel',
}

interface Props {
  unlocks: TechUnlockType[]
}

export default function TechUnlock({ unlocks }: Props) {
  if (!unlocks.length) return null

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {unlocks.map(u => {
        const name = u.name_en ?? u.name_zh ?? u.id
        const tier = u.required_mask_level != null ? MASK_TIERS[u.required_mask_level] ?? `Tier ${u.required_mask_level}` : null
        return (
          <div key={u.id} className="inline-flex items-center gap-2 px-3 py-1.5 text-[11px] border border-hair bg-panel">
            <svg viewBox="0 0 12 12" className="w-3 h-3 text-gold flex-shrink-0" fill="currentColor">
              <path d="M6 0L7.5 4.5L12 6L7.5 7.5L6 12L4.5 7.5L0 6L4.5 4.5Z" />
            </svg>
            <span className="text-text font-medium">{name}</span>
            {tier && <span className="text-text-dim">({tier} Mask)</span>}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/TechUnlock.tsx
git commit -m "feat: add TechUnlock component showing tech node requirements"
```

---

### Task 12: Frontend — Wire Everything into Item Page

**Files:**
- Modify: `web/src/pages/Item.tsx`

- [ ] **Step 1: Add item detail fetch and new component imports**

At the top of `Item.tsx`, add imports:

```tsx
import { fetchItemDetail } from '../lib/api'
import type { ItemDetail } from '../lib/types'
import ItemStats from '../components/ItemStats'
import ObtainedFrom from '../components/ObtainedFrom'
import TechUnlock from '../components/TechUnlock'
```

Inside the component, add a detail fetch hook after the existing `useEffect` for `pushVisit`:

```tsx
const [detail, setDetail] = useState<ItemDetail | null>(null)
useEffect(() => {
  if (!id) return
  setDetail(null)
  fetchItemDetail(id).then(setDetail).catch(() => setDetail(null))
}, [id])
```

- [ ] **Step 2: Add new sections to the JSX**

After `<ItemHeader>` and before the recipe `{recipe && (` block, add:

```tsx
{item.stats && item.stats.length > 0 && (
  <>
    <SectionHeader title="Stats" sub="Equipment Attributes" accent="green" />
    <ItemStats stats={item.stats} />
  </>
)}

{detail?.tech_unlocked_by && detail.tech_unlocked_by.length > 0 && (
  <>
    <SectionHeader title="Unlocked By" sub="Tech Tree" accent="gold" />
    <TechUnlock unlocks={detail.tech_unlocked_by} />
  </>
)}

{detail?.drop_sources && detail.drop_sources.length > 0 && (
  <>
    <SectionHeader title="Obtained From" sub="Drop Sources" accent="rust" />
    <ObtainedFrom sources={detail.drop_sources} />
  </>
)}
```

Also add `'gold'` and `'rust'` accent handling to the `SectionHeader` and `Ornament` components if not already present. Check existing accent values — the current code handles `'green'`, `'final'`, `'intermediate'`. Add:

In `Ornament`:
```tsx
accent === 'gold' ? '#b8a060' :
accent === 'rust' ? '#a67a52' :
```

In `SectionHeader` gradient:
```tsx
accent === 'gold' ? 'linear-gradient(90deg, #7a6830 0%, transparent 100%)' :
accent === 'rust' ? 'linear-gradient(90deg, #6e4d2e 0%, transparent 100%)' :
```

In `SectionHeader` titleColor:
```tsx
accent === 'gold' ? 'text-gold' :
accent === 'rust' ? 'text-rust' :
```

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/Item.tsx
git commit -m "feat: wire stats, tech unlock, and drop sources into item page"
```

---

### Task 13: Build, Run, Verify

- [ ] **Step 1: Rebuild DB**

```bash
python3 pipeline/build_db.py
```

- [ ] **Step 2: Build backend**

```bash
cd backend && go build ./cmd/server/
```

- [ ] **Step 3: Verify the graph payload includes new fields**

Start the server temporarily and curl:

```bash
curl -s localhost:8080/api/graph | python3 -c "import sys,json; g=json.load(sys.stdin); i=[x for x in g['items'] if x.get('stats')]; print(json.dumps(i[0], indent=2))"
```

Expected: item with `dz`, `w`, `dur`, `stats` fields.

- [ ] **Step 4: Verify item detail endpoint includes drop sources**

```bash
curl -s localhost:8080/api/items/Daoju_Item_EYuPi | python3 -m json.tool
```

Expected: `drop_sources` array with Alligator entries, `tech_unlocked_by` with node details.

- [ ] **Step 5: Check frontend**

Open browser, navigate to an item with stats (e.g. a weapon), verify:
- Description shows in header
- Stats table appears with English names
- Tech unlock badge shows if applicable
- Drop sources section shows for raw materials

- [ ] **Step 6: Final commit with DB**

```bash
git add data/app.db
git commit -m "chore: rebuild app.db with drop sources and enriched graph"
```
