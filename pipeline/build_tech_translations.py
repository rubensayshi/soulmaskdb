"""
Build data/translations/tech_tree_names.json by matching tech_tree.json nodes
against scraped English names from soulmaskdatabase.com, with manual fallbacks.

Three matching strategies (in priority order):
  1. Scraped main node names — position-matched against level-sorted main nodes
  2. Scraped sub node slugs — slug-matched against BP-prettified IDs
  3. Recipe output item names — for sub nodes that unlock exactly one recipe
  4. Manual Chinese→English dictionary — for everything else
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PARSED = ROOT / "Game" / "Parsed"
TRANSLATIONS = ROOT / "data" / "translations"
BRAINSTORM = ROOT / ".superpowers" / "brainstorm"


def slugify(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def prettify_bp_id(raw: str) -> str:
    s = re.sub(r"^(BP_KJS_SubNode_|BP_KJS_|BP_PeiFang_)", "", raw)
    s = s.replace("_", " ")
    return " ".join(w.capitalize() for w in s.split())


def load_json(p):
    return json.loads(p.read_text(encoding="utf-8"))


# --- Manual translations for nodes that don't match any scraped data ---
ZH_TO_EN = {
    # Guardian armor sets (untiered main nodes)
    "守护者套装（一）": "Guardian Armor Set I",
    "守护者套装（二）": "Guardian Armor Set II",
    "守护者套装（三）": "Guardian Armor Set III",
    "守护者套装（四）": "Guardian Armor Set IV",
    "守护者套装（五）": "Guardian Armor Set V",
    # Misc untiered
    "雕像": "Statues",
    "黑耀石建筑": "Obsidian Building",
    "节日家具": "Festival Furniture",
    "特殊家具": "Special Furniture",
    "简易船只": "Simple Boat",
    # Common sub node names that appear across modes
    "篝火": "Campfire",
    "营火": "Bonfire",
    "青铜基座营火": "Bronze Pit Bonfire",
    "黑铁基座营火": "Black Iron Pit Bonfire",
    "锻钢基座营火": "Steel Pit Bonfire",
    "精钢基座营火": "Fine Steel Pit Bonfire",
    # Sub nodes - building
    "茅草地基": "Thatch Foundation",
    "茅草墙": "Thatch Wall",
    "茅草盖板": "Thatch Cover",
    "茅草门": "Thatch Door",
    "家具": "Furniture",
    "茅草箱": "Thatch Box",
    "木制地基": "Wooden Foundation",
    "木制墙": "Wooden Wall",
    "木制盖板": "Wooden Cover",
    "木制门": "Wooden Door",
    "木制窗": "Wooden Window",
    "土石地基": "Stone Foundation",
    "土石墙": "Stone Wall",
    "土石盖板": "Stone Cover",
    "土石门": "Stone Door",
    "土石窗": "Stone Window",
    "巨石地基": "Blackstone Foundation",
    "巨石墙": "Blackstone Wall",
    "巨石盖板": "Blackstone Cover",
    "巨石门": "Blackstone Door",
    "巨石窗": "Blackstone Window",
    "黑曜石地基": "Obsidian Foundation",
    "黑曜石墙": "Obsidian Wall",
    "黑曜石盖板": "Obsidian Cover",
    "黑曜石门": "Obsidian Door",
    "黑曜石窗": "Obsidian Window",
    # Sub nodes - tools
    "石斧": "Stone Axe",
    "石镐": "Stone Pickaxe",
    "石铲": "Stone Shovel",
    "石锤": "Stone Hammer",
    "兽骨斧": "Bone Axe",
    "兽骨镐": "Bone Pickaxe",
    "兽骨铲": "Bone Shovel",
    "兽骨锤": "Bone Hammer",
    "青铜斧": "Bronze Axe",
    "青铜镐": "Bronze Pickaxe",
    "青铜铲": "Bronze Shovel",
    "青铜锤": "Bronze Hammer",
    "黑铁斧": "Iron Axe",
    "黑铁镐": "Iron Pickaxe",
    "黑铁铲": "Iron Shovel",
    "黑铁锤": "Iron Hammer",
    "锻钢斧": "Steel Axe",
    "锻钢镐": "Steel Pickaxe",
    "锻钢铲": "Steel Shovel",
    "锻钢锤": "Steel Hammer",
    "锻钢高斧": "Forged Steel Axe",
    "锻钢高镐": "Forged Steel Pickaxe",
    "锻钢高铲": "Forged Steel Shovel",
    "锻钢高锤": "Forged Steel Hammer",
    # Sub nodes - weapons
    "木矛": "Wooden Spear",
    "木弓": "Wooden Bow",
    "木锤": "Wooden Hammer",
    "木盾": "Wooden Shield",
    "藤鞭": "Vine Whip",
    "石矛": "Stone Spear",
    "石大剑": "Stone Greatsword",
    "石弓": "Stone Bow",
    "抛石器": "Sling",
    "投石器": "Catapult",
    "兽骨矛": "Bone Spear",
    "兽骨大剑": "Bone Greatsword",
    "兽骨弓": "Bone Bow",
    "兽骨弩": "Bone Crossbow",
    "青铜矛": "Bronze Spear",
    "青铜大剑": "Bronze Greatsword",
    "青铜弓": "Bronze Bow",
    "青铜弩": "Bronze Crossbow",
    "青铜单手剑": "Bronze Sword",
    "青铜刀": "Bronze Blade",
    "黑铁矛": "Iron Spear",
    "黑铁大剑": "Iron Greatsword",
    "黑铁弓": "Iron Bow",
    "黑铁弩": "Iron Crossbow",
    "黑铁单手剑": "Iron Sword",
    "黑铁刀": "Iron Blade",
    "锻钢矛": "Steel Spear",
    "锻钢大剑": "Steel Greatsword",
    "锻钢弓": "Steel Bow",
    "锻钢弩": "Steel Crossbow",
    "锻钢单手剑": "Steel Sword",
    "锻钢刀": "Steel Blade",
    # Sub nodes - gear/armor
    "粗布护甲": "Linen Armor",
    "粗布腿甲": "Linen Leggings",
    "粗布头盔": "Linen Helmet",
    "粗布手套": "Linen Gloves",
    "粗布鞋": "Linen Boots",
    "皮革护甲": "Leather Armor",
    "皮革腿甲": "Leather Leggings",
    "皮革头盔": "Leather Helmet",
    "皮革手套": "Leather Gloves",
    "皮革鞋": "Leather Boots",
    "青铜护甲": "Bronze Armor",
    "青铜腿甲": "Bronze Leggings",
    "青铜头盔": "Bronze Helmet",
    "青铜手套": "Bronze Gloves",
    "青铜鞋": "Bronze Boots",
    "黑铁护甲": "Iron Armor",
    "黑铁腿甲": "Iron Leggings",
    "黑铁头盔": "Iron Helmet",
    "黑铁手套": "Iron Gloves",
    "黑铁鞋": "Iron Boots",
    "锻钢护甲": "Steel Armor",
    "锻钢腿甲": "Steel Leggings",
    "锻钢头盔": "Steel Helmet",
    "锻钢手套": "Steel Gloves",
    "锻钢鞋": "Steel Boots",
    # Sub nodes - crafting/production
    "木匠桌": "Carpenter's Table",
    "初级木匠桌": "Basic Carpenter's Table",
    "中级木匠桌": "Medium Carpenter's Table",
    "高级木匠桌": "Advanced Carpenter's Table",
    "精细木匠桌": "Fine Carpenter's Table",
    "研磨器": "Grinder",
    "初级研磨器": "Basic Grinder",
    "中级研磨器": "Medium Grinder",
    "高级研磨器": "Advanced Grinder",
    "屠宰桌": "Butcher Table",
    "初级屠宰桌": "Basic Butcher Table",
    "中级屠宰桌": "Medium Butcher Table",
    "高级屠宰桌": "Advanced Butcher Table",
    "制革架": "Tannery",
    "初级制革架": "Basic Tannery",
    "中级制革架": "Medium Tannery",
    "高级制革架": "Advanced Tannery",
    "织布机": "Loom",
    "初级织布机": "Basic Loom",
    "中级织布机": "Medium Loom",
    "高级织布机": "Advanced Loom",
    "水力纺车": "Water Spinning Wheel",
    "工匠台": "Crafting Table",
    "初级工匠台": "Basic Crafting Table",
    "中级工匠台": "Medium Crafting Table",
    "高级工匠台": "Advanced Crafting Table",
    "灶台": "Cooking Stove",
    "高级灶台": "Advanced Cooking Stove",
    "制陶台": "Pottery Table",
    "高级制陶台": "Advanced Pottery Table",
    "土窑": "Kiln",
    "熔炉": "Furnace",
    "高炉": "Blast Furnace",
    "精炼炉": "Refining Furnace",
    "精锻台": "Enhancement Table",
    "拆解台": "Disassembly Table",
    "初级拆解台": "Basic Disassembly Table",
    "中级拆解台": "Medium Disassembly Table",
    "高级拆解台": "Advanced Disassembly Table",
    "制药台": "Alchemy Table",
    "初级制药台": "Basic Alchemy Table",
    "中级制药台": "Medium Alchemy Table",
    "高级制药台": "Advanced Alchemy Table",
    "酿造桶": "Brewing Barrel",
    "蒸馏器": "Distillery",
    "印染桶": "Dyeing Vat",
    "榨油机": "Oil Press",
    "料理台": "Cuisine Table",
    "风干箱": "Drying Rack",
    "冰窖": "Cold Storage",
    "水井": "Well",
    "水泵": "Water Pump",
    "风车": "Windmill",
    "切割机": "Cutting Machine",
    "碾磨机": "Grinding Mill",
    "车床": "Lathe",
    "动力工坊": "Power Workshop",
    # Sub nodes - farming/breeding
    "种植桶": "Planting Barrel",
    "高级种植桶": "Advanced Planting Barrel",
    "畜禽圈": "Animal Pen",
    "高级畜禽圈": "Advanced Animal Pen",
    "蜂箱": "Beehive",
    "鱼塘": "Fish Pond",
    "蚕房": "Silkworm House",
    # Sub nodes - misc
    "火把": "Torch",
    "初级箱子": "Basic Chest",
    "中级箱子": "Medium Chest",
    "高级箱子": "Advanced Chest",
    "面甲工艺": "Mask Technique",
    "标本制作": "Specimen Crafting",
    "升温技术": "Heating Technology",
    "降温技术": "Cooling Technology",
    # Sub nodes - ships
    "简易木筏": "Simple Raft",
    "木船": "Wooden Boat",
    "青铜快船": "Bronze Clipper",
    "青铜飞船": "Bronze Airship",
    "黑铁快船": "Iron Clipper",
    "黑铁飞船": "Iron Airship",
    "锻钢快船": "Steel Clipper",
    "锻钢飞船": "Steel Airship",
    # Sub nodes - siege
    "木制攻城器": "Wooden Siege Engine",
    "石制攻城器": "Stone Siege Engine",
    "青铜攻城器": "Bronze Siege Engine",
    "黑铁攻城器": "Iron Siege Engine",
    "锻钢攻城器": "Steel Siege Engine",
    # Sub nodes - defense
    "木制防御": "Wooden Defenses",
    "石制防御": "Stone Defenses",
    "青铜防御": "Bronze Defenses",
    "黑铁防御": "Iron Defenses",
    "锻钢防御": "Steel Defenses",
    # Sub nodes - enhancement/forging
    "工具精锻": "Tool Enhancement",
    "武器精锻": "Weapon Enhancement",
    "装备精锻": "Gear Enhancement",
    # Main nodes - management
    "初级建筑": "Basic Building",
    "原始武器": "Primitive Weapon",
    "粗布装备": "Linen Gear",
    "初级木匠": "Basic Carpentry",
    "初级工匠": "Basic Craftsmanship",
    "石质武器": "Stone Weapon",
    "石弹弓": "Stone Sling",
    "木石攻城器": "Wood & Stone Siege Engine",
    "兽骨工具": "Beast Bone Tools",
    "中级木匠": "Medium Carpentry",
    "中级工匠": "Medium Craftsmanship",
    "兽骨武器": "Beast Bone Weapon",
    "皮革装备": "Leather Gear",
    "青铜武器": "Bronze Weapon",
    "青铜装备": "Bronze Gear",
    "高级木匠": "Advanced Carpentry",
    "高级工匠": "Advanced Craftsmanship",
    "黑铁武器": "Iron Weapon",
    "黑铁装备": "Iron Gear",
    "精细木匠": "Fine Carpentry",
    "锻钢武器": "Steel Weapon",
    "锻钢装备": "Steel Gear",
    # Main nodes - survival-specific
    "原始工具": "Primitive Tool",
    "原始取火": "Primitive Fire Making",
    "存储设备": "Storage Gear",
    "初级研磨": "Basic Grinding",
    "初级屠宰": "Basic Slaughtering",
    "初级制革": "Basic Tannery",
    "初级织布": "Basic Weaving",
    "食物加工": "Food Processing",
    "制陶工艺": "Potting Technique",
    "畜禽养殖": "Animal Breeding",
    "进阶食物": "Premium Food",
    "作物种植": "Crop Planting",
    "进阶制陶": "Premium Potting",
    "中级建筑": "Medium Building",
    "中级屠宰": "Medium Slaughtering",
    "烧窑工艺": "Kiln Technique",
    "面甲工艺（主节点）": "Mask Technique",
    "造船技术": "Shipbuilding Technique",
    "风干工艺": "Drying Technique",
    "青铜工具": "Bronze Tool",
    "酿造工艺": "Brewing Technique",
    "印染工艺": "Dyeing Technique",
    "熔炼工艺": "Smelting Technique",
    "取水设施": "Water Intake",
    "中级研磨": "Medium Grinding",
    "进阶种植": "Premium Planting",
    "中级制革": "Medium Tannery",
    "飞船技术": "Airship Technique",
    "初级拆解": "Basic Uncraft",
    "初级制药": "Basic Potion Brewing",
    "生产基地": "Production Base",
    "进阶养殖": "Premium Breeding",
    "高级屠宰": "Advanced Slaughtering",
    "中级织布": "Medium Weaving",
    "料理技术": "Cuisine Processing",
    "榨油工艺": "Oil Pressing Technique",
    "高级建筑": "Advanced Building",
    "黑铁工具": "Iron Tools",
    "中级拆解": "Medium Uncraft",
    "高炉工艺": "Blast Furnace Technique",
    "降温技术": "Temperature Drop Technology",
    "高级制革": "Advanced Tannery",
    "中级制药": "Medium Potion Brewing",
    "冷藏设施": "Cold Storage Facility",
    "升温技术": "Temperature Rise Technology",
    "标本制作（主节点）": "Specimen Crafting",
    "进阶造船": "Premium Shipbuilding",
    "开采工艺": "Exploiting Technique",
    "煅烧工艺": "Calcination Technique",
    "风车工艺": "Windmill Technique",
    "高级织布": "Advanced Weaving",
    "锻钢工具": "Steel Tools",
    "精炼工艺": "Refining Technique",
    "高级研磨": "Advanced Grinding",
    "切割工艺": "Cutting Technique",
    "高级养殖": "Advanced Breeding",
    "高级制药": "Advanced Potion Brewing",
    "黑石建筑": "Blackstone Building",
    "高级拆解": "Advanced Uncraft",
    "动力工坊（主节点）": "Power Workshop",
    "蒸馏工艺": "Distillation Technique",
    "高级造船": "Advanced Shipbuilding",
    "精锻工艺": "Enhancing Technique",
    # Soldier/warrior mode
    "守卫设施": "Guard Facility",
    "守卫人偶": "Guard Puppet",
    "瞭望台": "Watchtower",
    "木制弩炮": "Wooden Ballista",
    "木制弹射器": "Wooden Catapult",
    "青铜弩炮": "Bronze Ballista",
    "青铜弹射器": "Bronze Catapult",
    "黑铁弩炮": "Iron Ballista",
    "黑铁弹射器": "Iron Catapult",
    "锻钢弩炮": "Steel Ballista",
    "锻钢弹射器": "Steel Catapult",
    "陷阱": "Trap",
    "木制陷阱": "Wooden Trap",
    "石制陷阱": "Stone Trap",
    "青铜陷阱": "Bronze Trap",
    "黑铁陷阱": "Iron Trap",
    "锻钢陷阱": "Steel Trap",
    "围栏": "Fence",
    "木制围栏": "Wooden Fence",
    "石制围栏": "Stone Fence",
    "巨石围栏": "Blackstone Fence",
    # Management mode specific
    "初级后勤": "Basic Logistics",
    "中级后勤": "Medium Logistics",
    "高级后勤": "Advanced Logistics",
    "初级训练": "Basic Training",
    "中级训练": "Medium Training",
    "高级训练": "Advanced Training",
    "部落管理": "Tribe Management",
    "高级管理": "Advanced Management",
    "任务管理": "Task Management",
    "农业管理": "Agriculture Management",
    "畜牧管理": "Livestock Management",
    "资源管理": "Resource Management",
    "巡逻管理": "Patrol Management",
    "商业管理": "Commerce Management",
    # Additional sub node names
    "初级木匠工艺": "Basic Carpentry Technique",
    "中级木匠工艺": "Medium Carpentry Technique",
    "高级木匠工艺": "Advanced Carpentry Technique",
    "精细木匠工艺": "Fine Carpentry Technique",
    "茅草建筑": "Thatch Building",
    "木制建筑": "Wooden Building",
    "土石建筑": "Stone Building",
    "巨石建筑": "Blackstone Building",
    "简易家具": "Simple Furniture",
    "中级家具": "Medium Furniture",
    "高级家具": "Advanced Furniture",
    "精致家具": "Fine Furniture",
    # More crafting stations
    "初级灶台": "Basic Cooking Stove",
    "烘焙架": "Baking Rack",
    "高级烘焙架": "Advanced Baking Rack",
    # More tools
    "石工具": "Stone Tools",
    "采集工具": "Gathering Tools",
    "伐木工具": "Logging Tools",
    "采矿工具": "Mining Tools",
    # Foods
    "基础食物": "Basic Food",
    "进阶食物加工": "Advanced Food Processing",
    "高级食物": "Premium Food",
    "烹饪技术": "Cooking Technique",
    # Misc
    "照明": "Lighting",
    "灯具": "Lamps",
    "装饰": "Decoration",
    "地毯": "Carpet",
    "挂饰": "Hanging Decoration",
    "旗帜": "Banner",
    "告示牌": "Sign",
    "楼梯": "Stairs",
    "柱子": "Pillar",
    "栅栏": "Railing",
    "木制楼梯": "Wooden Stairs",
    "木制柱子": "Wooden Pillar",
    "木制栅栏": "Wooden Railing",
    "土石楼梯": "Stone Stairs",
    "土石柱子": "Stone Pillar",
    "土石栅栏": "Stone Railing",
    "巨石楼梯": "Blackstone Stairs",
    "巨石柱子": "Blackstone Pillar",
    "巨石栅栏": "Blackstone Railing",
    # Bosses / challenge nodes
    "约战首领": "Challenge Boss",
    "印记技术": "Sigil Technique",
    # Crystal creatures (DLC)
    "水晶引魂犬": "Crystal Jackal King",
    "水晶圣甲虫": "Crystal Scarab",
    "水晶森罗鳄": "Crystal Sobek",
    # Statues
    "引魂犬雕像": "Jackal King Statue",
    "引魂犬黄金雕像": "Golden Jackal King Statue",
    "圣甲虫雕像": "Scarab Statue",
    "圣甲虫黄金雕像": "Golden Scarab Statue",
    "沙漠守卫雕像": "Desert Guardian Statue",
    "森罗鳄雕像": "Sobek Statue",
    "森罗鳄黄金雕像": "Golden Sobek Statue",
    # Ships
    "茅草船": "Thatch Boat",
    "高阶造船技术": "Advanced Shipbuilding Technique",
    "高阶晶源技术": "Advanced Crystal Technique",
    "进阶造船技术": "Advanced Shipbuilding Technique",
    "进阶晶源技术": "Advanced Crystal Technique",
    "船用沙橇": "Ship Sand Sled",
    # Alloy
    "合金工艺": "Alloy Technique",
    # Whips
    "锻钢刺鞭": "Steel Thorn Whip",
    "黑铁刺鞭": "Iron Thorn Whip",
    "青铜刺鞭": "Bronze Thorn Whip",
    "兽骨刺鞭": "Bone Thorn Whip",
    # DLC boss armor sets
    "森罗鳄套装": "Sobek Armor Set",
    "高级森罗鳄鳄套装": "Advanced Sobek Armor Set",
    "引魂犬套装": "Jackal King Armor Set",
    "高级引魂犬套装": "Advanced Jackal King Armor Set",
    "圣光套装": "Holy Light Armor Set",
    "高级圣光套装": "Advanced Holy Light Armor Set",
    # Challenge tribe bosses
    "约战掠夺者丛林王·穿心者": "Challenge Raider: Jungle King - Heartpiercer",
    "约战掠夺者首领·黑心": "Challenge Raider: Chief - Blackheart",
    "约战掠夺者山丘王·浸毒者": "Challenge Raider: Hill King - Poison Master",
    "约战掠夺者暗影王·影刃": "Challenge Raider: Shadow King - Shadow Blade",
    "约战掠夺者雪山王·噬心": "Challenge Raider: Snow King - Devourer",
    "约战掠夺者荒原王·爆破者": "Challenge Raider: Wasteland King - Demolisher",
    "约战掠夺者首领·维序者": "Challenge Raider: Chief - Peacekeeper",
    "约战掠夺者雪山王·万人屠": "Challenge Raider: Snow King - Slayer",
    "约战利爪部落首领·碎岩者": "Challenge Claw Tribe: Rockbreaker",
    "约战火石部落首领·硬骨头": "Challenge Flint Tribe: Hardbone",
    "约战毒牙部落首领·寒地毒王": "Challenge Fang Tribe: Frost Poison King",
    "约战火石部落首领·寒林守护者": "Challenge Flint Tribe: Frost Guardian",
    "约战利爪部落首领·黑林屠夫": "Challenge Claw Tribe: Dark Forest Butcher",
    "约战火石部落首领·观察者": "Challenge Flint Tribe: Observer",
    "约战火石部落首领·占星者": "Challenge Flint Tribe: Astrologer",
    "约战利爪部落首领·放血者": "Challenge Claw Tribe: Bleeder",
    "约战毒牙部落首领·饮血者": "Challenge Fang Tribe: Blooddrinker",
    "约战利爪部落首领·屠戮者": "Challenge Claw Tribe: Slaughterer",
    "约战毒牙部落首领·猛毒": "Challenge Fang Tribe: Deadly Poison",
    "约战毒牙部落首领·蛇心": "Challenge Fang Tribe: Serpent Heart",
    "约战火石部落首领·回光者": "Challenge Flint Tribe: Lightbringer",
    "约战毒牙部落战神": "Challenge Fang Tribe: War God",
    "约战利爪部落战神": "Challenge Claw Tribe: War God",
    "约战火石部落战神": "Challenge Flint Tribe: War God",
}

# Direct ID overrides for nodes with missing/empty name_zh
ID_TO_EN = {
    "BP_KJS_SubNode_GouHuo_2": "Campfire Upgrade",
}


def main():
    tech_nodes = load_json(PARSED / "tech_tree.json")
    recipes = load_json(PARSED / "recipes.json")
    po = load_json(TRANSLATIONS / "po.json")["entries"]
    manual_trans = load_json(TRANSLATIONS / "manual.json")["entries"]

    # Build recipe_id -> output item English name
    recipe_out = {}
    for r in recipes:
        out = r.get("output") or {}
        if out.get("item_id"):
            recipe_out[r["id"]] = out["item_id"]

    item_en = {}
    for k, v in po.items():
        if k.startswith("item:"):
            item_en[k[5:]] = v
    for k, v in manual_trans.items():
        if k.startswith("item:"):
            item_en.setdefault(k[5:], v)

    # Load scraped data
    scraped_subs = {}  # slug -> name
    scraped_mains = {"survival": [], "warrior": [], "tribe": []}
    for f, mode in [
        ("scraped_tech_names.json", "survival"),
        ("scraped_warrior.json", "warrior"),
        ("scraped_tribe.json", "tribe"),
    ]:
        p = BRAINSTORM / f
        if not p.exists():
            continue
        d = load_json(p)
        for s in d.get("subNodes", []):
            scraped_subs[s["slug"]] = s["name"]
        for m in d.get("mainNodes", []):
            scraped_mains[mode].append(m["name"])

    # Category -> mode mapping
    main_cat_mode = {
        "main": "survival",
        "main_action": "warrior",
        "main_management": "tribe",
    }

    entries = {}
    stats = {"scraped_main": 0, "scraped_sub": 0, "recipe_item": 0, "manual_zh": 0, "manual_bp": 0}

    # --- Strategy 1: Position-match main nodes against scraped main names ---
    for cat, mode in main_cat_mode.items():
        cat_nodes = [n for n in tech_nodes if n.get("category") == cat]
        # Split into tiered (has required_mask_level) and untiered
        tiered = sorted(
            [n for n in cat_nodes if n.get("required_mask_level") is not None],
            key=lambda n: (n["required_mask_level"], n["id"]),
        )
        names = scraped_mains.get(mode, [])

        if len(tiered) == len(names):
            for node, name in zip(tiered, names):
                entries[f"tech_node:{node['id']}"] = name
                stats["scraped_main"] += 1
        else:
            print(f"  WARNING: {cat} has {len(tiered)} tiered nodes but {len(names)} scraped names — falling back to manual")
            for node in tiered:
                zh = node.get("name_zh") or ""
                en = ZH_TO_EN.get(zh)
                if en:
                    entries[f"tech_node:{node['id']}"] = en
                    stats["manual_zh"] += 1
                else:
                    entries[f"tech_node:{node['id']}"] = prettify_bp_id(node["id"])
                    stats["manual_bp"] += 1

        # Untiered nodes (guardians, etc.)
        untiered = [n for n in cat_nodes if n.get("required_mask_level") is None]
        for node in untiered:
            zh = node.get("name_zh") or ""
            en = ZH_TO_EN.get(zh) or ID_TO_EN.get(node["id"])
            if en:
                entries[f"tech_node:{node['id']}"] = en
                stats["manual_zh"] += 1
            else:
                entries[f"tech_node:{node['id']}"] = prettify_bp_id(node["id"])
                stats["manual_bp"] += 1

    # --- Strategy 2+3: Sub nodes — scraped slug match, then recipe item name ---
    sub_cats = {"sub", "sub_action", "sub_management"}
    for node in tech_nodes:
        if node.get("category") not in sub_cats:
            continue
        key = f"tech_node:{node['id']}"
        if key in entries:
            continue

        # Try scraped slug match
        bp_slug = slugify(prettify_bp_id(node["id"]))
        if bp_slug in scraped_subs:
            entries[key] = scraped_subs[bp_slug]
            stats["scraped_sub"] += 1
            continue

        # Try Chinese name match
        zh = node.get("name_zh") or ""
        zh_slug = slugify(zh) if zh else ""
        matched = False
        for s_slug, s_name in scraped_subs.items():
            if slugify(s_name) == bp_slug or s_slug == zh_slug:
                entries[key] = s_name
                stats["scraped_sub"] += 1
                matched = True
                break
        if matched:
            continue

        # Try recipe output item name
        recipe_ids = node.get("unlocks_recipes") or []
        if len(recipe_ids) == 1:
            item_id = recipe_out.get(recipe_ids[0])
            if item_id and item_id in item_en:
                name = item_en[item_id]
                if not re.match(r"^[A-Z][a-z]+ [A-Z]", name) or "Item" not in name:
                    entries[key] = name
                    stats["recipe_item"] += 1
                    continue

        # Try multiple recipes — use first matching item name
        for rid in recipe_ids:
            item_id = recipe_out.get(rid)
            if item_id and item_id in item_en:
                entries[key] = item_en[item_id]
                stats["recipe_item"] += 1
                matched = True
                break
        if matched:
            continue

        # Manual Chinese translation
        if zh and zh in ZH_TO_EN:
            entries[key] = ZH_TO_EN[zh]
            stats["manual_zh"] += 1
            continue

        # Direct ID override
        if node["id"] in ID_TO_EN:
            entries[key] = ID_TO_EN[node["id"]]
            stats["manual_zh"] += 1
            continue

        # Last resort: prettified BP ID
        entries[key] = prettify_bp_id(node["id"])
        stats["manual_bp"] += 1

    out = {"source": "soulmaskdatabase.com + manual", "entries": entries}
    out_path = TRANSLATIONS / "tech_tree_names.json"
    out_path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    total = len(tech_nodes)
    covered = len(entries)
    print(f"Wrote {out_path} — {covered}/{total} nodes translated")
    print(f"  Scraped main (position-matched): {stats['scraped_main']}")
    print(f"  Scraped sub (slug-matched):      {stats['scraped_sub']}")
    print(f"  Recipe item name:                 {stats['recipe_item']}")
    print(f"  Manual Chinese dict:              {stats['manual_zh']}")
    print(f"  BP prettify fallback:             {stats['manual_bp']}")

    # Show BP prettify fallbacks for review
    if stats["manual_bp"] > 0:
        print(f"\n  BP prettify fallbacks ({stats['manual_bp']}):")
        for k, v in sorted(entries.items()):
            node = next((n for n in tech_nodes if f"tech_node:{n['id']}" == k), None)
            if node:
                zh = node.get("name_zh") or ""
                bp = prettify_bp_id(node["id"])
                if v == bp:
                    print(f"    {node['id']:55s} zh={zh:20s} -> {v}")


if __name__ == "__main__":
    main()
