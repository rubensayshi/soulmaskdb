# Replace saraserenity spawn data with our own extracted data

**Goal:** Write `pipeline/parse_spawns.py` that produces `Game/Parsed/spawn_locations.json` from our own .umap extraction + spawner blueprints, eliminating the saraserenity.net dependency.

**Architecture:** Join spawner coordinates (from .umap extraction on `origin/docs/spawn-extraction`) with spawner blueprints (from `uasset_export/Blueprints/ShuaGuaiQi/`) to resolve creature type + level range per spawn point. Convert UE4 world coords to map lat/lon. Output identical schema to what `build_db.py` already consumes.

**Tech Stack:** Python 3, stdlib only (gzip, json, re, glob). No deps.

---

## Data flow

```
spawns.json (origin/docs/spawn-extraction)     uasset_export/Blueprints/ShuaGuaiQi/**/*.json.gz
  6,832 actors with UE4 coords                   ~1,900 blueprints with creature class + level range
  actor_name → creature hint                      BP name → SCGInfoList → GuaiWuClass → creature
          │                                                  │
          └──────────── JOIN on actor_name↔BP name ──────────┘
                                    │
                          creature_names.json
                          (Pinyin → English)
                                    │
                                    ▼
                       Game/Parsed/spawn_locations.json
                       same schema as today: {creature, level, lat, lon, map, group}
```

## Key findings from research

**Coordinate transform** (refined from 31 matched points, max error <1 unit):
```
lon = round(pos_x * 0.0050178419 + 2048.206056)
lat = round(pos_y * -0.0050222678 + -2048.404771)
```

**Actor name → blueprint mapping** (3 strategies, covering 84% directly):
1. Direct: `BP_{prefix}` (e.g. `SGQ_ChiHou` → `BP_SGQ_ChiHou`)
2. Swap creature/tier: `SGQ_Eyu_T2` → `BP_SGQ_T2_Eyu`
3. Remaining 16% resolved from actor_name alone (creature name is embedded)

**Creature resolution priority:**
1. Match actor to blueprint → read `GuaiWuClass` import → extract Pinyin creature name
2. Fallback: parse creature name directly from actor_name (works for 99% of `HShuaGuaiQiBase`)

**Scope:** Only `HShuaGuaiQiBase` class (3,631 animal spawners). Skip `BP_HShuaGuaiQiRandNPC_C` (NPC tribes), `HShuaGuaiQiDiXiaCheng` (dungeon), and other non-animal classes. Only `Level01_GamePlay*` maps (open world).

**Missing creature translations** to add to `creature_names.json`:
```
LingYang/LinYang → Pronghorn      HuangLang → Wasteland Wolf
YeMa → Wild Horse                  HuangShi → Scorpion  
XieZhi/XieZi → Scorpion           PangXie → Coconut Crab
Mo → Tapir                         WuGui → Tortoise
DiaXiang → Elephant (typo)        Kurma → (mount prefix, skip)
ChiHou → (special enemy, skip)    *ShouWei → (mine guard, skip)
```

---

## File map

| File | Action | Purpose |
|---|---|---|
| `pipeline/parse_spawns.py` | Create | Main parser: join spawns.json + blueprints → spawn_locations.json |
| `data/translations/creature_names.json` | Modify | Add missing Pinyin→English entries |
| `pipeline/download_spawns.py` | Delete | No longer needed (saraserenity fetch) |
| `pipeline/build_db.py` | Modify | Remove `SPAWN_NAME_MAP` / `SPAWN_SKIP` (creature names now pre-normalized) |
| `Makefile` | Modify | Replace `download-spawns` target with `parse-spawns` |

---

### Task 1: Cherry-pick spawns.json from remote branch

- [ ] **Step 1: Get spawns.json onto master**

```bash
git checkout origin/docs/spawn-extraction -- Game/Parsed/spawns.json
```

This brings the 6,832-entry file with UE4 world coordinates into our working tree.

- [ ] **Step 2: Fix BOM encoding**

The file has a UTF-8 BOM. Strip it:

```python
# In parse_spawns.py, handle BOM:
raw = path.read_bytes()
text = raw.decode("utf-8-sig")
data = json.loads(text)
```

No file edit needed — just handle in the parser.

- [ ] **Step 3: Verify**

```bash
python3 -c "import json; d=json.loads(open('Game/Parsed/spawns.json','rb').read().decode('utf-8-sig')); print(len(d))"
# Expected: 6832
```

---

### Task 2: Add missing creature translations

- [ ] **Step 1: Update creature_names.json**

Add these entries to `data/translations/creature_names.json`:

```json
"LingYang": "Pronghorn",
"LinYang": "Pronghorn",
"YeMa": "Wild Horse",
"HuangLang": "Wasteland Wolf",
"HuangShi": "Scorpion",
"XieZhi": "Scorpion",
"XieZi": "Scorpion",
"PangXie": "Coconut Crab",
"Mo": "Tapir",
"WuGui": "Tortoise",
"DiaXiang": "Elephant",
"ShiRenHua": "Piranha Plant",
"Sobeck": "Sobek",
"JuanShe": "Boa Constrictor",
"ShouLong": "Dragon",
"KuangYeYuan": "Wilderness",
```

- [ ] **Step 2: Verify the file is valid JSON**

```bash
python3 -c "import json; json.load(open('data/translations/creature_names.json'))"
```

---

### Task 3: Write parse_spawns.py

- [ ] **Step 1: Create `pipeline/parse_spawns.py`**

The script does:

1. Load `Game/Parsed/spawns.json` (UE4 actor coordinates from .umap extraction)
2. Load all spawner blueprints from `uasset_export/Blueprints/ShuaGuaiQi/`
3. Load `data/translations/creature_names.json`
4. For each spawn actor in the open-world maps:
   a. Parse creature Pinyin name from actor_name
   b. Match to blueprint for level range + creature class validation
   c. Translate Pinyin → English creature name
   d. Convert UE4 coords to map lat/lon
5. Write `Game/Parsed/spawn_locations.json`

**Actor name parsing** (extract creature + elite flag from actor_name):
```python
# Strip trailing instance number: SGQ_Eyu_T2_1 → SGQ_Eyu_T2
prefix = re.sub(r"_?\d+$", "", actor_name)
parts = prefix.split("_")  # ["SGQ", "Eyu", "T2"]

# Extract creature name, tier, elite flag from parts
# Patterns:
#   SGQ_Creature_T*           → creature, tier, not elite
#   SGQ_Creature_Elite_T*     → creature, tier, elite
#   SGQ_Creature_T*_SubType   → creature, tier (SubType = Mu/Xiao/etc)
```

**Blueprint matching** (actor prefix → BP file):
```python
def find_blueprint(prefix, bp_lookup):
    # Strategy 1: direct
    if f"BP_{prefix}" in bp_lookup:
        return f"BP_{prefix}"
    # Strategy 2: swap creature name and tier
    parts = prefix.split("_")
    for i in range(1, len(parts)):
        for j in range(i+1, len(parts)):
            swapped = parts[:]
            swapped[i], swapped[j] = swapped[j], swapped[i]
            candidate = "BP_" + "_".join(swapped)
            if candidate in bp_lookup:
                return candidate
    return None
```

**Blueprint parsing** (extract creature class + level range):
```python
def parse_blueprint(path):
    with gzip.open(path) as f:
        data = json.load(f)
    imports = data.get("Imports", [])
    cdo = next((e for e in data["Exports"] if "Default__" in e.get("ObjectName", "")), None)
    if not cdo:
        return None
    scg_list = next((p for p in cdo["Data"] if p["Name"] == "SCGInfoList"), None)
    if not scg_list:
        return None
    # Walk SCGInfoList → SGBList → ShengChengGuaiConfig
    # Extract: GuaiWuClass (import ref → creature class name)
    #          SCGZuiXiaoDengJi (level min), SCGZuiDaDengJi (level max)
```

**Coordinate transform:**
```python
SCALE_LON = 0.0050178419
OFFSET_LON = 2048.206056
SCALE_LAT = -0.0050222678
OFFSET_LAT = -2048.404771

def ue4_to_map(pos_x, pos_y):
    return round(pos_x * SCALE_LON + OFFSET_LON), round(pos_y * SCALE_LAT + OFFSET_LAT)
```

**Output format** (same as current `spawn_locations.json`):
```json
{
  "creature": "Alligator",
  "group": "Animal Spawn",
  "level": "11 - 20",
  "lat": -2279,
  "lon": 3184,
  "map": "base"
}
```

**Creature name from actor_name** (fallback when no blueprint match):
```python
# Actor: SGQ_Eyu_T2 → creature pinyin = "Eyu"
# Actor: SGQ_EYu_Elite_T3 → creature pinyin = "EYu", elite = True
# Actor: SGQ_YiJi_T3_Eyu → context = "YiJi", creature = "Eyu"

# Parse: skip "SGQ", skip known context prefixes (YiJi, Kuang, etc.),
# skip tier tokens (T1-T12), skip "Elite" → remaining token is creature
```

**Elite naming:**
```python
if is_elite:
    creature_name = f"Elite {english_name}"
else:
    creature_name = english_name
```

**Level range string:**
```python
if level_min == level_max:
    level = str(level_min)
else:
    level = f"{level_min} - {level_max}"
```

- [ ] **Step 2: Run it and check output**

```bash
python3 pipeline/parse_spawns.py
```

Expected: prints summary (total spawns, by creature, by map). Check count is in the same ballpark as the current 7,057.

- [ ] **Step 3: Spot-check Giant Alligator**

```bash
python3 -c "
import json
data = json.load(open('Game/Parsed/spawn_locations.json'))
ga = [s for s in data if 'Alligator' in s['creature']]
from collections import Counter
print(Counter(s['creature'] for s in ga))
"
```

Should show Alligator (T2+T3+T5 spawns) + Elite Alligator entries.

---

### Task 4: Update build_db.py

- [ ] **Step 1: Simplify spawn loading**

The `SPAWN_NAME_MAP` and `SPAWN_SKIP` dicts in `build_db.py:398-447` are no longer needed — creature names come pre-normalized from our parser. Simplify the spawn loading to:

```python
spawn_path = PARSED / "spawn_locations.json"
spawn_count = 0
if spawn_path.exists():
    spawn_data = load_json(spawn_path)
    for s in spawn_data:
        db.execute(
            "INSERT OR IGNORE INTO creature_spawns (creature_type, lat, lon, level_desc, map) "
            "VALUES (?,?,?,?,?)",
            (s["creature"], s["lat"], s["lon"], s.get("level") or None, s.get("map", "base")),
        )
        spawn_count += 1
```

- [ ] **Step 2: Verify database builds correctly**

```bash
make db
```

Check the spawn count in the output. Should be close to current value.

---

### Task 5: Update Makefile and delete download script

- [ ] **Step 1: Check current Makefile targets**

Look for `download-spawns` or similar target and replace with `parse-spawns`.

- [ ] **Step 2: Delete `pipeline/download_spawns.py`**

No longer needed — we generate spawn data from our own exports.

- [ ] **Step 3: Add spawns.json to the pipeline flow**

Make sure `make db` or equivalent runs `parse_spawns.py` before `build_db.py`.

---

### Task 6: Validate end-to-end

- [ ] **Step 1: Run full pipeline**

```bash
make db
pm2 restart souldb-be
```

- [ ] **Step 2: Check in browser**

Visit an item page that shows spawn locations (e.g. Alligator Hide). Verify the spawn map still renders with the correct number of spawn points.

- [ ] **Step 3: Compare coverage**

```bash
python3 -c "
import json
data = json.load(open('Game/Parsed/spawn_locations.json'))
from collections import Counter
creatures = Counter(s['creature'] for s in data)
print(f'Total: {len(data)} spawns, {len(creatures)} creatures')
for c, n in creatures.most_common(20):
    print(f'  {c}: {n}')
"
```

---

## Known limitations

1. **DLC map (Shifting Sands):** 0 spawners were extracted from Level02 .umap files. DLC spawns will be missing until those sublevels are identified and exported on the Windows machine.
2. **Generic mine spawners** (`SGQ_Kuang_T*_DongWu/YeShou`): ~34 spawns where the creature type is a random pool defined in the blueprint. These will need per-blueprint parsing to resolve which creature actually spawns.
3. **Ruins context spawners** (`SGQ_YiJi_T*_YeShou`): These are `BP_HShuaGuaiQiRandNPC_C` class (NPC groups), not animal spawners. Currently excluded — matches saraserenity's "(Ruins)" entries being in `SPAWN_SKIP`.
4. **(Multiple) entries**: Saraserenity has 111 "(Multiple)" spawns for locations with random creature pools. Our extraction can identify these and either skip them or list all possible creatures.
