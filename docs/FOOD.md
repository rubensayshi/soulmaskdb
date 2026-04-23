# Food & Potion Buff Reference

Structured buff data extracted by `pipeline/parse_food_buffs.py` from GameEffect (GE) blueprints. Each food/potion item in `items.json` now has a `buffs` field with modifiers, duration, and Chinese buff name/description.

## How buffs work

Every consumable references one or more GameEffect blueprints via `UserGEList`. Each GE contains:

- **Modifiers**: static attribute changes (attribute, value, op, duration)
- **Executions**: runtime-computed effects (mood/XinQing) — flagged as `has_unextractable_effects`
- **Duration policy**: `HasDuration` (timed) or instant
- **Stacking**: most food buffs are `AggregateByTarget` with stack limit 1 (eating again refreshes)

Instant effects (food restore, water restore, health regen multiplier) apply immediately. Timed effects last for the stated duration.

## Coverage

| Category | Items with buffs | Notes                                    |
| -------- | ---------------- | ---------------------------------------- |
| Food     | 47               | All have mood/XinQing execution effects  |
| Potion   | 19               | Mix of instant and timed                 |
| **Total** | **66**          |                                          |

12 GEs use custom execution classes (blueprint code) whose values can't be extracted statically. These are mostly mood (XinQing) effects. The Chinese buff description (`buff_desc_zh`) still describes the full effect for these items.

## Duration tiers

| Duration | Count | Typical tier                |
| -------- | ----- | --------------------------- |
| Instant  | 11    | Potions, raw snacks         |
| 5 min    | 7     | Basic cooked meat, jerky    |
| 10 min   | 15    | Grilled/roasted, basic pots |
| 20 min   | 17    | Drinks, mid-tier dishes     |
| 30 min   | 16    | Top-tier meals, fried food  |

## Buff groups

Foods are categorized by which companion preference they satisfy. Each food item has exactly one preference attribute (`meat_preference`, `fruit_preference`, `staple_preference`) or none (recreative). The preference value determines how much the companion's satisfaction increases.

### Meat (17 items) — HP & healing

Every meat dish gives **max_health**. Higher tiers add healing, attack, or consumption reduction.

| Tier  | Item                       | Duration | Key buffs                               | Pref |
| ----- | -------------------------- | -------- | --------------------------------------- | ---- |
| Top   | 火鸡套餐 Turkey Dinner      | 30min    | healing +8, max HP +200                 | 100  |
| Top   | 烟熏火腿 Smoked Ham         | 30min    | attack +10, max HP +200                 | 100  |
| Top   | 油炸稀有肋排 Fried Rare Ribs | 30min   | healing +10, max HP +200, x10 HP regen  | —    |
| High  | 土锅炖辣汤 Spicy Stew       | 30min    | max HP +200, food use -80%              | 50   |
| High  | 腌优质肉干 Fine Jerky        | 20min    | attack +5, max HP +100                  | 50   |
| High  | 鱼肉混锅 Fish Mix Pot       | 30min    | max HP +200, water use -80%             | 30   |
| Mid   | 珍稀熟肉 Rare Cooked Meat   | 20min    | healing +4, max HP +150                 | 40   |
| Mid   | 酱熟肉 Braised Meat         | 20min    | max HP +150, food use -50%              | 20   |
| Mid   | 辣酱蝗虫 Spicy Locusts      | 20min    | max HP +100, food use -40%              | 20   |
| Mid   | 鱼汤 Fish Soup              | 20min    | max HP +100, water use -40%             | 20   |
| Mid   | 腌优质肉干 Cured Jerky      | 20min    | attack +5, max HP +100                  | 50   |
| Basic | 煎优质肉排 Fried Steak      | 10min    | healing +6, max HP +100                 | 60   |
| Basic | 优质熟肉 Quality Meat       | 10min    | healing +2, max HP +100                 | 20   |
| Basic | 烤火鸡肉 Roasted Turkey     | 10min    | healing +2, max HP +100                 | 30   |
| Basic | 肉汤 Meat Soup              | 10min    | max HP +100, water use -20%             | 20   |
| Basic | 烤蝗虫串 Roasted Locusts    | 10min    | max HP +50, food use -20%               | 5    |
| Basic | 熟肉 Cooked Meat            | 5min     | healing +0.5, max HP +50                | 10   |
| Basic | 熟鱼肉 Cooked Fish          | 5min     | healing +1, max HP +50                  | 15   |
| Basic | 腌肉干 Jerky                | 5min     | defense +5%                             | 20   |
| Basic | 腌鱼干 Dried Fish           | 5min     | defense +7%                             | —    |

Sub-themes:
- **Healing line**: 熟肉 → 优质熟肉 → 珍稀熟肉 → 火鸡套餐 (scaling healing + max HP)
- **Attack line**: 腌优质肉干 → 烟熏火腿 (attack + max HP)
- **Consumption reduction**: 烤蝗虫串 → 辣酱蝗虫 → 土锅炖辣汤 (food use -20% → -40% → -80%)
- **Water efficiency**: 肉汤 → 鱼汤 → 鱼肉混锅 (water use -20% → -40% → -80%)

### Fruit & Vegetables (8 items) — stamina & speed

Every fruit/veg dish gives **max_stamina**. Higher tiers add stamina regen, speed, or environmental resistance.

| Tier  | Item                        | Duration | Key buffs                              | Pref |
| ----- | --------------------------- | -------- | -------------------------------------- | ---- |
| Top   | 油炸南瓜圈 Fried Pumpkin Rings | 30min  | stamina regen +100%, max stamina +20   | 80   |
| Top   | 混合果酱 Mixed Jam            | 30min    | speed +?% (computed), max stam +20, -rad | 80 |
| Top   | 迷幻之锅 Psychedelic Pot      | 30min    | oxygen +2, -poison/s, max stamina +20  | 40   |
| Mid   | 南瓜沙拉 Pumpkin Salad        | 20min    | stamina regen +50%, max stamina +10    | 40   |
| Mid   | 水果烤肉串 Fruit Kebab        | 20min    | speed +5%, max stamina +10, -rad       | 40   |
| Mid   | 蘑菇汤 Mushroom Soup          | 20min    | oxygen +1, -poison/s, max stamina +10  | 10   |
| Basic | 烤南瓜 Roasted Pumpkin        | 10min    | stamina regen +25%, max stamina +5     | 10   |
| Basic | 烤蘑菇 Roasted Mushroom       | 10min    | oxygen +0.5, -poison/s, max stamina +5 | 5    |

Sub-themes:
- **Stamina regen line**: 烤南瓜 → 南瓜沙拉 → 油炸南瓜圈 (+25% → +50% → +100%)
- **Speed/radiation line**: 水果烤肉串 → 混合果酱 (speed + anti-radiation)
- **Anti-poison/oxygen line**: 烤蘑菇 → 蘑菇汤 → 迷幻之锅 (oxygen +0.5 → +1 → +2)

### Staple Food (10 items) — carry weight, defense & max food

Every staple food gives **max_food**. Splits into carry weight (potato) and defense (corn) lines, plus a unique XP line (quinoa).

| Tier  | Item                          | Duration | Key buffs                           | Pref |
| ----- | ----------------------------- | -------- | ----------------------------------- | ---- |
| Top   | 油炸玉米卷饼 Fried Corn Tortilla | 30min  | defense +20, max food +40           | 100  |
| Top   | 炸土豆包 Fried Potato Bun       | 30min    | carry weight +80, max food +40      | 80   |
| Top   | 海鲜藜麦饭 Seafood Quinoa Rice  | 30min    | crit dmg +10%, max food +40, XP +2  | 80   |
| Mid   | 水饺 Dumplings                  | 30min    | carry weight +50, max food +30      | 40   |
| Mid   | 玉米饼 Corn Cake                | 20min    | defense +10, max food +20           | 40   |
| Mid   | 煮土豆 Boiled Potato            | 20min    | carry weight +40, max food +20      | 40   |
| Mid   | 藜麦粥 Quinoa Porridge          | 20min    | crit dmg +5%, max food +20, XP +1   | 40   |
| Basic | 烤土豆 Baked Potato             | 10min    | carry weight +20, max food +10      | 20   |
| Basic | 烤玉米 Roasted Corn             | 10min    | defense +5, max food +10            | 20   |
| Basic | 熟花生 Roasted Peanuts          | instant  | (food +5 only)                      | 5    |

Sub-themes:
- **Carry weight line**: 烤土豆 → 煮土豆 → 水饺 → 炸土豆包 (+20 → +40 → +50 → +80)
- **Defense line**: 烤玉米 → 玉米饼 → 油炸玉米卷饼 (+5 → +10 → +20)
- **XP/crit line**: 藜麦粥 → 海鲜藜麦饭 (growth XP +1/+2, crit damage +5%/+10%)

### Recreative (12 items) — drinks, tobacco, specialty

No companion preference attribute. Provides resistance, combat stats, or utility.

#### Drinks — non-alcoholic (4)

| Item                    | Duration | Key buffs                           |
| ----------------------- | -------- | ----------------------------------- |
| 冰可可 Ice Cocoa         | 20min    | heat resistance +10, max water +20  |
| 热可可 Hot Cocoa          | 20min    | cold resistance +10, max water +10  |
| 水果汁 Fruit Juice       | 20min    | poison resistance +10, max water +10 |
| 马黛茶 Mate Tea          | 30min    | poison resist +20, max water +20, -5 rad |

All restore 100 water. Mate tea is the best non-alcoholic drink (30min, stronger buffs).

#### Drinks — alcoholic (4)

| Item                      | Duration | Key buffs                         |
| ------------------------- | -------- | --------------------------------- |
| 果酒 Fruit Wine            | 20min    | damage +3%, cold resist +3        |
| 蜂蜜酒 Mead               | 30min    | damage +6%, cold resist +3        |
| 梅斯卡尔酒 Mezcal          | 10min    | crit chance +3%, cold resist +3   |
| 龙舌兰酒 Tequila           | 20min    | crit chance +6%, cold resist +3   |

All restore 40 water + 20 food. Two lines: damage (果酒 → 蜂蜜酒) and crit chance (梅斯卡尔酒 → 龙舌兰酒). All give cold resistance +3.

#### Tobacco (1)

| Item          | Duration | Key buffs                                        |
| ------------- | -------- | ------------------------------------------------ |
| 卷烟 Cigarette | 20min    | crit defense +10%, awareness +0.25, max awareness -0.25 |

Unique trade-off: gains awareness at the cost of max awareness.

#### Misc (3)

| Item                | Duration | Key buffs               |
| ------------------- | -------- | ----------------------- |
| 煮鸡蛋 Boiled Egg   | 30min    | healing +100, food +50  |
| 腌鱼干 Dried Fish   | 5min     | defense +7%             |
| 熟花生 Roasted Peanut | instant | food +5 only            |

## Potions (19 items)

Potions don't have companion preferences. They split into functional categories:

### Healing (instant)

| Item                       | Effect                              |
| -------------------------- | ----------------------------------- |
| 芦荟汁 Aloe Juice           | healing +20                         |
| 芦荟精华 Aloe Extract       | healing +80                         |
| 植物精粹 Plant Essence       | healing +200, poison x0.4 (cleanse) |
| 活血膏 Blood Salve           | healing (over time)                 |
| 凝血膏 Clotting Salve        | healing (over time)                 |
| 生血膏 Blood Regen Salve     | healing (over time), stamina +100   |
| 赤血精华 Blood Essence       | healing (over time), stamina +150   |

### Combat drugs (5min, massive stats)

| Item                           | Max HP  | Attack | Defense |
| ------------------------------ | ------- | ------ | ------- |
| 神秘潜能药剂 Mystery Potential  | +2,000  | +100   | +100    |
| 神秘激发药剂 Mystery Stimulant  | +3,000  | +150   | +150    |
| 神秘狂暴药剂 Mystery Berserker  | +4,000  | +200   | +200    |

Short duration (5min) but enormous stat boost. Best-in-class for boss fights.

### Resistance & cleansing

| Item                            | Duration | Effect                                    |
| ------------------------------- | -------- | ----------------------------------------- |
| 抗毒药剂 Anti-Poison             | 10min    | poison resist +50, poison dmg reduction +20% |
| 抗辐射精华 Anti-Radiation        | instant  | radiation x0.5 (halves current radiation) |
| 化瘀汤 Detox Soup                | 10min    | heat dmg reduction +20%, -radiation/sec   |
| 仙人掌汁 Cactus Juice           | instant  | stamina +10, poison x0.9                  |
| 仙人掌精华 Cactus Extract       | instant  | stamina +40, poison x0.8                  |

### Utility

| Item                        | Duration | Effect                                  |
| --------------------------- | -------- | --------------------------------------- |
| 兴奋药剂 Stimulant           | 10min    | speed +10%, cold dmg reduction +20%, awareness +0.5 |
| 精油 Essential Oil           | 30min    | mood +0.2, awareness +0.1               |
| 疾病清解汤 Disease Cure Soup  | 10min    | cures disease (execution-based)         |
| 疾病特效汤 Disease Special Soup | 10min  | cures disease (execution-based)         |

## Attribute reference

All 40 attributes found in food/potion GE files:

| Raw name                     | English name             | Typical foods                        |
| ---------------------------- | ------------------------ | ------------------------------------ |
| Attack                       | attack                   | Smoked Ham, Fine Jerky               |
| ChengZhangExpRate            | growth_exp_rate          | Seafood Quinoa, Quinoa Porridge      |
| Crit                         | crit_chance              | Tequila, Mezcal                      |
| CritDamageInc                | crit_damage              | Seafood Quinoa, Quinoa Porridge      |
| CritDef                      | crit_defense             | Cigarette                            |
| CurMaxJingShen               | max_awareness            | Cigarette, Essential Oil             |
| Damage                       | damage                   | (combat GEs only)                    |
| DamageInc                    | damage_increase          | Mead, Fruit Wine                     |
| Defense                      | defense                  | Corn Tortilla, Corn Cake             |
| Du                           | poison                   | Mushroom Soup, Cactus Juice          |
| DuDamageDec                  | poison_damage_reduction  | Anti-Poison potion                   |
| DuKang                       | poison_resistance        | Anti-Poison, Mate Tea, Fruit Juice   |
| Food                         | food                     | Nearly all foods (instant restore)   |
| FoodConsume                  | food_consumption         | Spicy Locusts, Braised Meat          |
| FoodConsumePctTiLiRecover    | food_stamina_recovery    | (paired with food_consumption)       |
| FuShe                        | radiation                | Mixed Jam, Fruit Kebab, Mate Tea     |
| GuoShuValue                  | fruit_preference         | Fruit & Veg group foods              |
| HanDamageDec                 | cold_damage_reduction    | Stimulant potion                     |
| HanKang                      | cold_resistance          | Hot Cocoa, all alcohol               |
| Healing                      | healing                  | All meat dishes, healing potions     |
| HealthRecover                | health_regen             | Various (instant multiplier)         |
| HuXi                         | oxygen                   | Mushroom dishes, Psychedelic Pot     |
| JingShen                     | awareness                | Cigarette, Stimulant, Essential Oil  |
| MaxFood                      | max_food                 | All staple foods                     |
| MaxFuZhong                   | max_carry_weight         | Potato line, Dumplings               |
| MaxHealth                    | max_health               | All meat dishes, combat drugs        |
| MaxTiLi                      | max_stamina              | All fruit & veg dishes               |
| MaxWater                     | max_water                | Non-alcoholic drinks                 |
| RouShiValue                  | meat_preference          | Meat group foods                     |
| SpeedRate                    | speed                    | Fruit Kebab, Mixed Jam, Stimulant    |
| TiLi                         | stamina                  | Cactus Juice/Extract                 |
| TiLiRecover                  | stamina_regen            | Pumpkin line                         |
| Water                        | water                    | Most drinks (instant restore)        |
| WaterConsume                 | water_consumption        | Fish Soup, Fish Mix Pot              |
| WaterConsumePctTiLiRecover   | water_stamina_recovery   | (paired with water_consumption)      |
| WenDuSanRe                   | heat_dissipation         | (temperature GEs)                    |
| XinQing                      | mood                     | Essential Oil, most foods (via exec) |
| YanDamageDec                 | heat_damage_reduction    | Detox Soup                           |
| YanKang                      | heat_resistance          | Ice Cocoa                            |
| ZhuShiValue                  | staple_preference        | Staple Food group foods              |

## Data shape in items.json

```json
{
  "id": "DaoJu_Item_BingKeKe",
  "category": "food",
  "name_zh": "冰可可",
  "buffs": {
    "modifiers": [
      { "attribute": "heat_resistance", "value": 10.0, "op": "add", "duration_seconds": 1200.0 },
      { "attribute": "max_water", "value": 20.0, "op": "add", "duration_seconds": 1200.0 },
      { "attribute": "water", "value": 100.0, "op": "add" },
      { "attribute": "food", "value": 20.0, "op": "add" }
    ],
    "buff_name_zh": "冰可可",
    "buff_desc_zh": "炎抗提升10，水分上限提高20，持续20分钟",
    "duration_seconds": 1200.0,
    "has_unextractable_effects": true
  }
}
```

Fields:
- `modifiers[].attribute`: English attribute name (see table above)
- `modifiers[].value`: float value, or `null` if `computed: true`
- `modifiers[].op`: `"add"` or `"multiply"` (multiply 0.8 = -20%)
- `modifiers[].duration_seconds`: present on timed modifiers; absent on instant
- `modifiers[].computed`: `true` when value is calculated at runtime (1 item: Mixed Jam speed)
- `buff_name_zh` / `buff_desc_zh`: Chinese buff display name and tooltip
- `duration_seconds`: longest timed effect duration (top-level convenience field)
- `has_unextractable_effects`: `true` when some effects use blueprint execution classes
