#!/usr/bin/env python3
"""Translate trait names and descriptions from Chinese to English.

Outputs data/translations/traits.json in the same format as other translation files.
Uses pattern-based translation for formulaic traits (preferences, tribe-born, origin)
and a hardcoded dict for combat/title trait names. Descriptions are translated via
clause-level pattern matching.

When PO file translations become available, they will override these via the
translations table priority system in build_db.py.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PARSED = ROOT / "Game" / "Parsed"
TRANSLATIONS = ROOT / "data" / "translations"

# ---------------------------------------------------------------------------
# Name translations
# ---------------------------------------------------------------------------

# Preference trait prefixes (XiHao source)
PREF_PREFIX = {
    "厌恶": "Hates",
    "嗜好": "Loves",
    "喜好": "Likes",
    "喜欢": "Likes",
    "喜爱": "Loves",
    "抵触": "Dislikes",
    "钟爱": "Adores",
}

# Preference subjects
PREF_SUBJECT = {
    "下雨": "Rain",
    "下雪": "Snow",
    "主食": "Staple Food",
    "传奇首领": "Legendary Leaders",
    "傍水": "Water Proximity",
    "动物": "Animals",
    "喝酒": "Drinking",
    "寒冷": "Cold",
    "巨象": "Elephants",
    "布制衣物": "Cloth Clothing",
    "平庸首领": "Mediocre Leaders",
    "排泄": "Defecation",
    "晴天": "Sunny Weather",
    "杰出首领": "Outstanding Leaders",
    "果蔬": "Fruits & Vegetables",
    "水域": "Water Areas",
    "河马": "Hippos",
    "洗澡": "Bathing",
    "清寒": "Cool Weather",
    "温热": "Warm Weather",
    "火烈鸟": "Flamingos",
    "炎热": "Hot Weather",
    "烟草": "Tobacco",
    "犀牛": "Rhinos",
    "犰狳蜥": "Armadillo Lizards",
    "猴子": "Monkeys",
    "番茄": "Tomatoes",
    "皮质衣物": "Leather Clothing",
    "石制武器": "Stone Weapons",
    "羊驼和大羊驼": "Alpacas & Llamas",
    "群居": "Living in Groups",
    "肉食": "Meat",
    "舒适温度": "Comfortable Temperature",
    "被鞭打": "Being Whipped",
    "象龟": "Tortoises",
    "豹子": "Leopards",
    "起床": "Waking Up",
    "跳舞": "Dancing",
    "躺平": "Lying Down",
    "酱熟肉": "Braised Meat",
    "野猪": "Boars",
    "长角牛": "Longhorn Cattle",
    "青铜护甲": "Bronze Armor",
    "青铜武器": "Bronze Weapons",
    "鞭打": "Whipping",
    "食人鱼": "Piranhas",
    "饮酒": "Drinking",
    "驴": "Donkeys",
    "骆驼": "Camels",
    "骨制武器": "Bone Weapons",
    "鸡": "Chickens",
    "鸵鸟": "Ostriches",
    "鹦鹉": "Parrots",
}

# Standalone preference names (no prefix+subject pattern)
PREF_STANDALONE = {
    "恐怖嗜好": "Terrifying Obsession",
    "特殊癖好": "Special Quirk",
    "这味对咯": "That's the Stuff",
    "喜好被鞭打": "Likes Being Whipped",
    "喜好鞭打": "Likes Whipping",
    "嗜好被鞭打": "Loves Being Whipped",
    "嗜好鞭打": "Loves Whipping",
}

# Combat (Normal) trait names
COMBAT_NAMES = {
    "不善负重": "Poor Load Bearer",
    "不擅肉搏": "Poor Melee",
    "不擅远程": "Poor Ranged",
    "不易察觉": "Hard to Detect",
    "两败俱伤": "Mutual Destruction",
    "以攻代守": "Offense as Defense",
    "以牙还牙": "Eye for an Eye",
    "伐木巧手": "Skilled Lumberjack",
    "伤害共鸣·攻": "Damage Resonance: ATK",
    "伤害共鸣·防": "Damage Resonance: DEF",
    "伤害流转·攻": "Damage Flow: ATK",
    "伤害流转·防": "Damage Flow: DEF",
    "伺机连袭": "Opportunistic Combo",
    "体力窃取": "Stamina Steal",
    "体力虹吸": "Stamina Siphon",
    "体能充沛": "Abundant Stamina",
    "体能枯竭": "Stamina Depletion",
    "余烬": "Embers",
    "先攻": "First Strike",
    "免伤祈佑": "Damage Immunity Blessing",
    "免伤窃取": "Damage Immunity Steal",
    "全盛战意": "Peak Battle Spirit",
    "全盛状态": "Peak Condition",
    "减轻伤势": "Mitigate Wounds",
    "出血抑制": "Bleed Suppression",
    "切石加速": "Masonry Speed Up",
    "制甲专注": "Armorsmithing Focus",
    "制皮加速": "Leatherwork Speed Up",
    "制陶加速": "Pottery Speed Up",
    "刺鞭增伤": "Whip Damage Boost",
    "加重伤势": "Worsen Wounds",
    "动脉破坏": "Artery Destruction",
    "势大力沉": "Overwhelming Force",
    "勇气传递": "Courage Transfer",
    "勇气激流": "Courage Torrent",
    "化解危机": "Defuse Crisis",
    "单刀减伤": "Sword Damage Reduction",
    "单刀增伤": "Sword Damage Boost",
    "危机反应": "Crisis Response",
    "友谊之焰": "Flame of Friendship",
    "双刀减伤": "Dual Blade Damage Reduction",
    "双刀增伤": "Dual Blade Damage Boost",
    "反击时刻": "Counter Moment",
    "后发制人": "Counter Initiative",
    "喘息之机": "Breathing Room",
    "回光反击": "Last Light Counter",
    "回光返照": "Last Light Revival",
    "坚定不移": "Unwavering",
    "垂死挣扎": "Death Struggle",
    "增伤祈佑": "Damage Boost Blessing",
    "增伤窃取": "Damage Boost Steal",
    "处决威慑": "Execution Intimidation",
    "复仇之怒": "Vengeful Rage",
    "多重射击": "Multi Shot",
    "多重投掷": "Multi Throw",
    "大腿应激": "Leg Stress Response",
    "大锤减伤": "Hammer Damage Reduction",
    "大锤增伤": "Hammer Damage Boost",
    "天生霉运": "Born Unlucky",
    "天赋异禀": "Gifted",
    "头部应激": "Head Stress Response",
    "头部破坏": "Head Destruction",
    "夺势": "Seize Momentum",
    "奋起反击": "Rallying Counter",
    "嫁祸": "Scapegoat",
    "完美吸收": "Perfect Absorption",
    "容易口渴": "Easily Thirsty",
    "容易饥饿": "Easily Hungry",
    "射手脚步": "Archer Footwork",
    "尾部破坏": "Tail Destruction",
    "屠戮狂热": "Slaughter Frenzy",
    "工具精修": "Tool Refinement",
    "工匠制造加速": "Crafting Speed Up",
    "巧劲": "Finesse",
    "巧铸防具": "Skilled Armor Forging",
    "巨剑减伤": "Greatsword Damage Reduction",
    "巨剑增伤": "Greatsword Damage Boost",
    "应激加速": "Stress Acceleration",
    "建筑制造加速": "Construction Speed Up",
    "弓箭减伤": "Bow Damage Reduction",
    "弓箭增伤": "Bow Damage Boost",
    "弱化防御": "Weaken Defense",
    "弱点强化": "Weak Point Fortify",
    "弱点重击": "Weak Point Strike",
    "强力攻击": "Power Attack",
    "强化防御": "Fortify Defense",
    "强韧愈合": "Resilient Healing",
    "微风劲雨": "Gentle Wind Fierce Rain",
    "心念合一": "Mind Unity",
    "心术不正": "Ill Intent",
    "忍耐": "Endurance",
    "忍耐爆发": "Endurance Burst",
    "忍辱负重": "Bear the Burden",
    "快速包扎": "Quick Bandage",
    "快速吸收（水）": "Quick Absorption (Water)",
    "快速吸收（食）": "Quick Absorption (Food)",
    "快速射击": "Rapid Fire",
    "快速成长": "Fast Growth",
    "快速装填": "Quick Reload",
    "怒火倾泻": "Rage Outpour",
    "怒焰焚身": "Rage Flames",
    "恶意": "Malice",
    "悄无声息": "Silent Steps",
    "惊天动地": "Earth-Shaking",
    "愈战愈勇": "Battle Hardened",
    "意志坚定": "Iron Will",
    "愚钝": "Dull Witted",
    "战术闪避": "Tactical Dodge",
    "手段残忍": "Cruel Methods",
    "手臂应激": "Arm Stress Response",
    "技巧恢复": "Skill Recovery",
    "抑制暴力": "Violence Suppression",
    "拳套减伤": "Gauntlet Damage Reduction",
    "拳套增伤": "Gauntlet Damage Boost",
    "挫敌锐气": "Demoralize",
    "撕裂伤口": "Tear Wound",
    "擅长肉搏": "Melee Expert",
    "攫体化血": "Body to Blood",
    "攫体化韧": "Body to Toughness",
    "攻其不备": "Catch Off Guard",
    "攻击弱化": "Attack Weaken",
    "攻击窃取": "Attack Steal",
    "攻势凌厉": "Fierce Assault",
    "攻势羸弱": "Weak Assault",
    "攻速窃取": "Attack Speed Steal",
    "攻防共鸣·攻": "ATK-DEF Resonance: ATK",
    "攻防共鸣·防": "ATK-DEF Resonance: DEF",
    "攻防流转·攻": "ATK-DEF Flow: ATK",
    "攻防流转·防": "ATK-DEF Flow: DEF",
    "敌陨狂热": "Kill Frenzy",
    "暴击窃取": "Crit Steal",
    "暴抗窃取": "Crit Resist Steal",
    "暴走": "Rampage",
    "木石加速": "Carpentry Speed Up",
    "机敏": "Alert",
    "极限闪避": "Extreme Dodge",
    "染血荆棘": "Bloody Thorns",
    "格挡反击": "Block Counter",
    "步伐迅捷": "Swift Steps",
    "步伐迟缓": "Slow Steps",
    "步履沉重": "Heavy Footsteps",
    "步履轻盈": "Light Footsteps",
    "武器制造加速": "Weaponry Speed Up",
    "武器精修": "Weapon Refinement",
    "武器精铸": "Weapon Forging",
    "死灰复燃": "Rise from Ashes",
    "毒躯": "Toxic Body",
    "气定神闲": "Calm and Composed",
    "气血亏虚": "Qi Deficiency",
    "气血充盈": "Qi Abundance",
    "洞察防御": "Insight Defense",
    "活血": "Blood Vitality",
    "浊血之毒": "Tainted Blood Poison",
    "浴血恢复": "Blood Bath Recovery",
    "淬锋巧手": "Skilled Blade Temper",
    "混乱弹反": "Chaos Parry",
    "混乱防御": "Chaos Defense",
    "渴望鲜血": "Blood Thirst",
    "溃防冲击": "Shield Break Impact",
    "滞缓之毒": "Slowing Poison",
    "激发斗志": "Rally Fighting Spirit",
    "火势蔓延": "Fire Spread",
    "灵活逃脱": "Agile Escape",
    "炼金加速": "Alchemy Speed Up",
    "烧窑加速": "Kiln Speed Up",
    "烹饪加速": "Cooking Speed Up",
    "燃烧威慑": "Burning Intimidation",
    "燃魂狙击": "Soul Flame Snipe",
    "爆发共鸣·攻": "Burst Resonance: ATK",
    "爆发共鸣·防": "Burst Resonance: DEF",
    "爆发流转·攻": "Burst Flow: ATK",
    "爆发流转·防": "Burst Flow: DEF",
    "爆毒之种": "Poison Seed",
    "爆燃之种": "Fire Seed",
    "爆血之种": "Blood Seed",
    "牵引投掷": "Grapple Throw",
    "狡诈": "Cunning",
    "猛攻": "Onslaught",
    "珠宝制造加速": "Jewelry Speed Up",
    "生命枷锁": "Life Shackle",
    "畏惧烈焰": "Fear of Fire",
    "痛苦逆转": "Pain Reversal",
    "直击要害": "Strike Vitals",
    "盾防反击": "Shield Counter",
    "矿脉守护": "Ore Vein Guardian",
    "研磨加速": "Grinding Speed Up",
    "破坏闪击": "Destruction Flash",
    "破胆重击": "Terrifying Strike",
    "硬化身躯": "Hardened Body",
    "硬皮·抗挥砍": "Tough Skin: Slash Resist",
    "硬皮·抗穿刺": "Tough Skin: Pierce Resist",
    "硬皮·抗钝击": "Tough Skin: Blunt Resist",
    "磐石意志": "Bedrock Will",
    "禁忌之躯": "Forbidden Body",
    "种植能手": "Skilled Planter",
    "移速窃取": "Move Speed Steal",
    "穿透防御": "Piercing Defense",
    "竭血逐攻": "Blood Chase Attack",
    "笨拙": "Clumsy",
    "精制工具": "Refined Tools",
    "精制防具": "Refined Armor",
    "纺织加速": "Weaving Speed Up",
    "绝境应激": "Desperation Response",
    "缓慢包扎": "Slow Bandage",
    "缓慢吸收（水）": "Slow Absorption (Water)",
    "缓慢吸收（食）": "Slow Absorption (Food)",
    "缓慢射击": "Slow Fire",
    "缓慢成长": "Slow Growth",
    "缓慢装填": "Slow Reload",
    "群狼庇护": "Wolf Pack Protection",
    "群狼战魂": "Wolf Pack Battle Spirit",
    "耐渴": "Thirst Resistant",
    "耐饿": "Hunger Resistant",
    "耳聪": "Sharp Hearing",
    "耳背": "Hard of Hearing",
    "肢体破坏": "Limb Destruction",
    "背包扩容": "Backpack Expansion",
    "脚步笨拙": "Clumsy Footwork",
    "腿脚灵活": "Agile Legs",
    "致命": "Lethal",
    "致命节奏": "Lethal Rhythm",
    "舍命相搏": "Fight to the Death",
    "蛮角庇护": "Savage Horn Protection",
    "蛮角战魂": "Savage Horn Battle Spirit",
    "血上加霜": "Bleeding Aggravation",
    "血液黏稠": "Thick Blood",
    "血脉压制": "Bloodline Suppression",
    "行迹可疑": "Suspicious Behavior",
    "誓死决心": "Deathsworn Resolve",
    "诅咒之击": "Cursed Strike",
    "诡计之手": "Trickster's Hand",
    "身强力壮": "Strong and Sturdy",
    "躯干应激": "Torso Stress Response",
    "躯干破坏": "Torso Destruction",
    "转守为攻": "Switch to Offense",
    "软皮·弱挥砍": "Soft Skin: Slash Weak",
    "软皮·弱穿刺": "Soft Skin: Pierce Weak",
    "软皮·弱钝击": "Soft Skin: Blunt Weak",
    "轻装速行": "Light Travel",
    "迅捷共鸣·攻": "Swift Resonance: ATK",
    "迅捷共鸣·防": "Swift Resonance: DEF",
    "迅捷流转·攻": "Swift Flow: ATK",
    "迅捷流转·防": "Swift Flow: DEF",
    "近视": "Nearsighted",
    "远程打击": "Ranged Strike",
    "远视": "Farsighted",
    "连锁闪避": "Chain Dodge",
    "迷惑弹反": "Confusion Parry",
    "迷惑防御": "Confusion Defense",
    "逃脱宿命": "Escape Fate",
    "逆闪弹反": "Reverse Flash Parry",
    "逆闪防御": "Reverse Flash Defense",
    "避实击虚": "Strike at Weakness",
    "避开要害": "Avoid Vitals",
    "醉意感应": "Drunken Perception",
    "重整旗鼓": "Rally",
    "重装奔袭": "Heavy Charge",
    "野性觉醒": "Wild Awakening",
    "钢铁之躯": "Iron Body",
    "锥骨之伤": "Bone Piercing Wound",
    "锻器专注": "Forging Focus",
    "长矛减伤": "Spear Damage Reduction",
    "长矛增伤": "Spear Damage Boost",
    "闪避投掷": "Dodge Throw",
    "防具制造加速": "Armor Crafting Speed Up",
    "防具精修": "Armor Refinement",
    "防御强袭": "Defense Assault",
    "防御窃取": "Defense Steal",
    "震荡弹反": "Shock Parry",
    "震荡防御": "Shock Defense",
    "霸体崩解": "Super Armor Break",
    "静态恢复": "Static Recovery",
    "驼牛": "Pack Ox",
    "鲜血吸收": "Blood Absorption",
}

# Title (ChengHao) trait names
TITLE_NAMES = {
    "不幸者": "The Unfortunate",
    "不焚者": "The Unburnable",
    "劳动狂人": "Work Maniac",
    "夜行者": "Nightwalker",
    "天生反骨": "Natural Rebel",
    "天生苦力": "Born Laborer",
    "夺心者": "Heart Seizer",
    "屠宰能手": "Master Butcher",
    "幸运者": "The Lucky One",
    "手工能人": "Skilled Craftsman",
    "扼运者": "Fate Strangler",
    "斧头杀手": "Axe Killer",
    "断骨者": "Bone Breaker",
    "无畏者": "The Fearless",
    "易焚者": "The Flammable",
    "林中屠夫": "Forest Butcher",
    "武器大师": "Weapon Master",
    "破箱人": "Crate Breaker",
    "硬骨头": "Tough Nut",
    "种田能手": "Master Farmer",
    "穿肺者": "Lung Piercer",
    "箭术大师": "Archery Master",
    "粗活能手": "Rough Work Expert",
    "精造巧手": "Master Artisan",
    "细活能手": "Fine Work Expert",
    "著名废物": "Famous Slacker",
    "送葬者": "Undertaker",
    "镇压者": "Suppressor",
    "飞刀刺客": "Throwing Knife Assassin",
    "饮血者": "Blood Drinker",
}

# Tribe-born (BornBuLuoCiTiao) names
TRIBE_NAMES = {
    "部落·幸存者": "Tribe: Survivor",
    "部落·侵袭之力": "Tribe: Assault Power",
    "部落·狂野之力": "Tribe: Wild Power",
    "部落·暴击之力": "Tribe: Crit Power",
    "部落·暴抗之力": "Tribe: Crit Resist Power",
    "部落·坚韧之力": "Tribe: Resilience Power",
    "部落·抵御之力": "Tribe: Resistance Power",
    "部落·荒狼之力": "Tribe: Wild Wolf Power",
    "部落·荒狼之息": "Tribe: Wild Wolf Breath",
    "部落·蛮角之力": "Tribe: Savage Horn Power",
    "部落·蛮角之息": "Tribe: Savage Horn Breath",
    "部落·毒素免疫": "Tribe: Poison Immunity",
    "部落·毒素抵抗": "Tribe: Poison Resistance",
    "部落·毒免寒冷抗性": "Tribe: Poison Immunity & Cold Resist",
    "部落·毒免炎热抗性": "Tribe: Poison Immunity & Heat Resist",
    "部落·毒素寒冷抗性": "Tribe: Poison & Cold Resist",
    "部落·毒素炎热抗性": "Tribe: Poison & Heat Resist",
    "部落·毒素辐射抗性": "Tribe: Poison & Radiation Resist",
    "部落·体力炎热抗性": "Tribe: Stamina & Heat Resist",
    "部落·体力辐射抗性": "Tribe: Stamina & Radiation Resist",
    "部落·耐力炎热抗性": "Tribe: Endurance & Heat Resist",
    "部落·耐力辐射抗性": "Tribe: Endurance & Radiation Resist",
    "部落·免伤炎热抗性": "Tribe: Damage Immunity & Heat Resist",
    "部落·免伤辐射抗性": "Tribe: Damage Immunity & Radiation Resist",
    "部落·增伤炎热抗性": "Tribe: Damage Boost & Heat Resist",
    "部落·增伤辐射抗性": "Tribe: Damage Boost & Radiation Resist",
    "部落·暴伤寒冷抗性": "Tribe: Crit Damage & Cold Resist",
    "部落·暴伤炎热抗性": "Tribe: Crit Damage & Heat Resist",
    "部落·暴伤辐射抗性": "Tribe: Crit Damage & Radiation Resist",
    "部落·暴击寒冷抗性": "Tribe: Crit & Cold Resist",
    "部落·暴击炎热抗性": "Tribe: Crit & Heat Resist",
    "部落·暴击辐射抗性": "Tribe: Crit & Radiation Resist",
    "部落·防御寒冷抗性": "Tribe: Defense & Cold Resist",
    "部落·防御炎热抗性": "Tribe: Defense & Heat Resist",
    "部落·防御辐射抗性": "Tribe: Defense & Radiation Resist",
    "部落·坚韧寒冷抗性": "Tribe: Resilience & Cold Resist",
    "部落·坚韧炎热抗性": "Tribe: Resilience & Heat Resist",
    "部落·坚韧辐射抗性": "Tribe: Resilience & Radiation Resist",
    "流放者·寒冷抗性": "Exile: Cold Resist",
    "流放者·炎热抗性": "Exile: Heat Resist",
    "流放者·辐射抗性": "Exile: Radiation Resist",
}

# Origin (BornChuShen) names
ORIGIN_NAMES = {
    "出身·苦力": "Origin: Laborer",
    "出身·杂工": "Origin: Handyman",
    "出身·匠人": "Origin: Artisan",
    "出身·护卫": "Origin: Guard",
    "出身·搏斗": "Origin: Fighter",
    "出身·狩猎": "Origin: Hunter",
    "出身·生存": "Origin: Survivor",
    "出身·劳动慢热": "Origin: Slow Labor Start",
    "出身·手工慢热": "Origin: Slow Craft Start",
    "出身·杂活慢热": "Origin: Slow Misc Start",
    "出身·拙劣生存·I": "Origin: Poor Survival I",
    "出身·拙劣生存·II": "Origin: Poor Survival II",
    "出身·拙劣生存·III": "Origin: Poor Survival III",
    "出身·沉迷护卫": "Origin: Guard Obsessed",
    "出身·沉迷搏斗": "Origin: Fight Obsessed",
    "出身·沉迷狩猎": "Origin: Hunt Obsessed",
}

# Personality (XingGe) names
PERSONALITY_NAMES = {
    "性格·懒惰": "Personality: Lazy",
    "性格·懦弱": "Personality: Cowardly",
    "性格·温和": "Personality: Gentle",
    "性格·激进": "Personality: Aggressive",
    "性格·狂躁": "Personality: Manic",
    "性格·谨慎": "Personality: Cautious",
}

# Experience (JingLi) names
EXPERIENCE_NAMES = {
    "经历·能征善战": "Experience: Battle Hardened",
}

# DLC combat trait names (if any are missing from COMBAT_NAMES, add here)
DLC_NAMES = {
    "屠宰能手": "Master Butcher",
    "手工能人": "Skilled Craftsman",
    "种田能手": "Master Farmer",
    "粗活能手": "Rough Work Expert",
    "细活能手": "Fine Work Expert",
}


def translate_name(name_zh: str) -> str | None:
    """Translate a trait name from Chinese to English."""
    if not name_zh:
        return None

    # Check all direct lookup dicts first
    for d in [COMBAT_NAMES, TITLE_NAMES, TRIBE_NAMES, ORIGIN_NAMES,
              PERSONALITY_NAMES, EXPERIENCE_NAMES, DLC_NAMES, PREF_STANDALONE]:
        if name_zh in d:
            return d[name_zh]

    # Pattern-based: preference traits (prefix + subject)
    for prefix_zh, prefix_en in sorted(PREF_PREFIX.items(), key=lambda x: -len(x[0])):
        if name_zh.startswith(prefix_zh):
            subject_zh = name_zh[len(prefix_zh):]
            subject_en = PREF_SUBJECT.get(subject_zh)
            if subject_en:
                return f"{prefix_en} {subject_en}"

    return None


# ---------------------------------------------------------------------------
# Description translation — clause-level pattern matching
# ---------------------------------------------------------------------------

# Class-exclusive prefixes
CLASS_PREFIX = {
    "【猎手专属】": "[Hunter] ",
    "【利爪专属】": "[Claw] ",
    "【毒牙专属】": "[Fang] ",
    "【火石专属】": "[Flint] ",
    "【卫士专属】": "[Guardian] ",
    "【战士专属】": "[Warrior] ",
    "【匠人专属】": "[Artisan] ",
    "【杂工专属】": "[Handyman] ",
    "【荒狼专属】": "[Wild Wolf] ",
    "【蛮角专属】": "[Savage Horn] ",
}

# Full description overrides for complex/narrative descriptions
DESC_OVERRIDES: dict[str, str] = {}

# Clause-level replacements (applied via regex)
# Order matters: longer patterns first to avoid partial matches
CLAUSE_PATTERNS: list[tuple[re.Pattern, str]] = [
    # --- stat boost/reduction (simple) ---
    (re.compile(r"移动速度提升(\d+\.?\d*)%"), r"movement speed increased by \1%"),
    (re.compile(r"移动速度降低(\d+\.?\d*)%"), r"movement speed decreased by \1%"),
    (re.compile(r"攻速提升(\d+\.?\d*)%"), r"attack speed increased by \1%"),
    (re.compile(r"攻击速度提升(\d+\.?\d*)%"), r"attack speed increased by \1%"),
    (re.compile(r"攻击速度降低(\d+\.?\d*)%"), r"attack speed decreased by \1%"),
    (re.compile(r"攻击力提升(\d+\.?\d*)%"), r"attack power increased by \1%"),
    (re.compile(r"攻击力降低(\d+\.?\d*)%"), r"attack power decreased by \1%"),
    (re.compile(r"攻击力大幅降低"), r"attack power greatly reduced"),
    (re.compile(r"攻击降低(\d+\.?\d*)%"), r"attack decreased by \1%"),
    (re.compile(r"防御力提升(\d+\.?\d*)%"), r"defense increased by \1%"),
    (re.compile(r"防御力降低(\d+\.?\d*)%"), r"defense decreased by \1%"),
    (re.compile(r"防御降低(\d+\.?\d*)%"), r"defense decreased by \1%"),
    (re.compile(r"受到伤害降低(\d+\.?\d*)%"), r"damage taken reduced by \1%"),
    (re.compile(r"受到的伤害降低(\d+\.?\d*)%"), r"damage taken reduced by \1%"),
    (re.compile(r"受到伤害提高(\d+\.?\d*)%"), r"damage taken increased by \1%"),
    (re.compile(r"受到的伤害提升(\d+\.?\d*)%"), r"damage taken increased by \1%"),
    (re.compile(r"受到的伤害提高(\d+\.?\d*)%"), r"damage taken increased by \1%"),
    (re.compile(r"受到的伤害降低(\d+\.?\d*)%"), r"damage taken reduced by \1%"),
    (re.compile(r"造成的伤害提升(\d+\.?\d*)%"), r"damage dealt increased by \1%"),
    (re.compile(r"造成的伤害降低(\d+\.?\d*)%"), r"damage dealt decreased by \1%"),
    (re.compile(r"伤害提升(\d+\.?\d*)%"), r"damage increased by \1%"),
    (re.compile(r"伤害降低(\d+\.?\d*)%"), r"damage decreased by \1%"),
    (re.compile(r"最大生命提升(\d+\.?\d*)%"), r"max HP increased by \1%"),
    (re.compile(r"最大生命值降低(\d+\.?\d*)%"), r"max HP decreased by \1%"),
    (re.compile(r"最大负重提升(\d+\.?\d*)%"), r"max carry weight increased by \1%"),
    (re.compile(r"最大负重提高(\d+\.?\d*)%"), r"max carry weight increased by \1%"),
    (re.compile(r"最大负重降低(\d+\.?\d*)%"), r"max carry weight decreased by \1%"),
    (re.compile(r"暴击率提升(\d+\.?\d*)%"), r"crit rate increased by \1%"),
    (re.compile(r"暴击伤害提升(\d+\.?\d*)%"), r"crit damage increased by \1%"),
    (re.compile(r"暴击伤害永久提升(\d+\.?\d*)%"), r"crit damage permanently increased by \1%"),
    (re.compile(r"暴击率永久提升(\d+\.?\d*)%"), r"crit rate permanently increased by \1%"),
    (re.compile(r"暴击提升(\d+\.?\d*)%"), r"crit rate increased by \1%"),
    (re.compile(r"暴击下降(\d+\.?\d*)%"), r"crit rate decreased by \1%"),
    (re.compile(r"暴击率降低(\d+\.?\d*)%"), r"crit rate decreased by \1%"),
    (re.compile(r"暴抗提升(\d+\.?\d*)%"), r"crit resist increased by \1%"),
    (re.compile(r"暴抗降低(\d+\.?\d*)%"), r"crit resist decreased by \1%"),
    (re.compile(r"暴抗极大幅度提升"), r"crit resist greatly increased"),
    (re.compile(r"最大体力提升(\d+)"), r"max stamina increased by \1"),
    (re.compile(r"饱食度最大值提升(\d+\.?\d*)%"), r"max food capacity increased by \1%"),
    (re.compile(r"最大饱食度降低(\d+\.?\d*)%"), r"max food capacity decreased by \1%"),
    (re.compile(r"最大水分提升(\d+\.?\d*)%"), r"max water capacity increased by \1%"),
    (re.compile(r"最大水分降低(\d+\.?\d*)%"), r"max water capacity decreased by \1%"),
    (re.compile(r"生命恢复速度提升(\d+\.?\d*)%"), r"HP regen speed increased by \1%"),
    (re.compile(r"自然生命恢复降低(\d+\.?\d*)%"), r"natural HP regen reduced by \1%"),
    (re.compile(r"视野距离提升(\d+)米"), r"vision range increased by \1m"),
    (re.compile(r"视野距离降低(\d+)米"), r"vision range decreased by \1m"),

    # --- weapon damage ---
    (re.compile(r"单刀类武器造成的伤害提升(\d+\.?\d*)%"), r"sword damage increased by \1%"),
    (re.compile(r"长矛类武器造成的伤害提升(\d+\.?\d*)%"), r"spear damage increased by \1%"),
    (re.compile(r"弓武器造成的伤害提升(\d+\.?\d*)%"), r"bow damage increased by \1%"),
    (re.compile(r"锤类武器造成的伤害提升(\d+\.?\d*)%"), r"hammer damage increased by \1%"),
    (re.compile(r"拳套类武器造成的伤害提升(\d+\.?\d*)%"), r"gauntlet damage increased by \1%"),
    (re.compile(r"巨剑类武器造成的伤害提升(\d+\.?\d*)%"), r"greatsword damage increased by \1%"),
    (re.compile(r"双刀类武器造成的伤害提升(\d+\.?\d*)%"), r"dual blade damage increased by \1%"),
    (re.compile(r"刺鞭类武器造成的伤害提升(\d+\.?\d*)%"), r"whip damage increased by \1%"),
    (re.compile(r"使用刀类武器造成的伤害降低(\d+\.?\d*)%"), r"sword damage decreased by \1%"),
    (re.compile(r"使用矛类武器造成的伤害降低(\d+\.?\d*)%"), r"spear damage decreased by \1%"),
    (re.compile(r"使用弓武器造成的伤害降低(\d+\.?\d*)%"), r"bow damage decreased by \1%"),
    (re.compile(r"使用锤类武器造成的伤害降低(\d+\.?\d*)%"), r"hammer damage decreased by \1%"),
    (re.compile(r"使用拳套类武器造成的伤害降低(\d+\.?\d*)%"), r"gauntlet damage decreased by \1%"),
    (re.compile(r"使用巨剑类武器造成的伤害降低(\d+\.?\d*)%"), r"greatsword damage decreased by \1%"),
    (re.compile(r"使用双刀类武器造成的伤害降低(\d+\.?\d*)%"), r"dual blade damage decreased by \1%"),
    (re.compile(r"使用任意武器造成的伤害提升(\d+\.?\d*)%"), r"all weapon damage increased by \1%"),

    # --- damage type resistance ---
    (re.compile(r"受到穿刺类型伤害时受到的伤害降低(\d+\.?\d*)%"), r"pierce damage taken reduced by \1%"),
    (re.compile(r"受到挥砍类型伤害时受到的伤害降低(\d+\.?\d*)%"), r"slash damage taken reduced by \1%"),
    (re.compile(r"受到钝击类型伤害时受到的伤害降低(\d+\.?\d*)%"), r"blunt damage taken reduced by \1%"),
    (re.compile(r"受到穿刺类型伤害时受到的伤害提升(\d+\.?\d*)%"), r"pierce damage taken increased by \1%"),
    (re.compile(r"受到挥砍类型伤害时受到的伤害提升(\d+\.?\d*)%"), r"slash damage taken increased by \1%"),
    (re.compile(r"受到钝击类型伤害时受到的伤害提升(\d+\.?\d*)%"), r"blunt damage taken increased by \1%"),

    # --- crafting speed ---
    (re.compile(r"完成(.+?)工作的时间缩短(\d+\.?\d*)%"), r"\1 work time reduced by \2%"),
    (re.compile(r"完成(.+?)任务的时间缩短(\d+\.?\d*)%"), r"\1 task time reduced by \2%"),
    (re.compile(r"完成食物的时间缩短(\d+\.?\d*)%"), r"cooking time reduced by \1%"),
    (re.compile(r"产出高品质概率提升(\d+\.?\d*)%"), r"high quality output chance increased by \1%"),
    (re.compile(r"产出高品质的概率提升(\d+\.?\d*)%"), r"high quality output chance increased by \1%"),

    # --- food/water consumption ---
    (re.compile(r"食物消耗降低(\d+\.?\d*)%"), r"food consumption reduced by \1%"),
    (re.compile(r"水分消耗降低(\d+\.?\d*)%"), r"water consumption reduced by \1%"),
    (re.compile(r"食物消耗提升(\d+\.?\d*)%"), r"food consumption increased by \1%"),
    (re.compile(r"水分消耗提升(\d+\.?\d*)%"), r"water consumption increased by \1%"),

    # --- duration / cooldown ---
    (re.compile(r"持续(\d+)s"), r"lasts \1s"),
    (re.compile(r"持续(\d+)秒"), r"lasts \1s"),
    (re.compile(r"持续时间(\d+)s"), r"lasts \1s"),
    (re.compile(r"[（(]冷却时间(\d+)s[)）]"), r"(CD: \1s)"),
    (re.compile(r"[（(]冷却时间(\d+)秒[)）]"), r"(CD: \1s)"),
    (re.compile(r"冷却时间(\d+)s"), r"CD: \1s"),
    (re.compile(r"冷却时间(\d+)秒"), r"CD: \1s"),

    # --- probability ---
    (re.compile(r"有\s*(\d+\.?\d*)%\s*的?概率"), r"\1% chance to "),
    (re.compile(r"有(\d+\.?\d*)%概率"), r"\1% chance to "),
    (re.compile(r"(\d+\.?\d*)%的概率"), r"\1% chance"),

    # --- stacking ---
    (re.compile(r"至多叠加(\d+)层"), r"stacks up to \1 times"),
    (re.compile(r"至多(\d+)人"), r"up to \1 allies"),

    # --- range ---
    (re.compile(r"(\d+)米范围内"), r"within \1m"),
    (re.compile(r"(\d+)米以内"), r"within \1m"),
    (re.compile(r"(\d+)米外"), r"beyond \1m"),
    (re.compile(r"(\d+)米内"), r"within \1m"),

    # --- growth/experience ---
    (re.compile(r"成长经验提升(\d+\.?\d*)%"), r"growth XP increased by \1%"),
    (re.compile(r"成长经验降低(\d+\.?\d*)%"), r"growth XP decreased by \1%"),
    (re.compile(r"熟练度成长速度提升(\d+\.?\d*)%"), r"proficiency growth speed increased by \1%"),
    (re.compile(r"熟练度成长速度降低(\d+\.?\d*)%"), r"proficiency growth speed decreased by \1%"),

    # --- combat mechanics ---
    (re.compile(r"生命值低于(\d+\.?\d*)%时"), r"when HP below \1%"),
    (re.compile(r"生命值高于(\d+\.?\d*)%以上时"), r"when HP above \1%"),
    (re.compile(r"体力在(\d+\.?\d*)%以上"), r"when stamina above \1%"),
    (re.compile(r"体力低于(\d+\.?\d*)%"), r"when stamina below \1%"),
    (re.compile(r"韧性超过(\d+\.?\d*)%"), r"when toughness above \1%"),
    (re.compile(r"韧性值全满"), r"toughness is full"),
    (re.compile(r"生命值全满"), r"HP is full"),
    (re.compile(r"恢复(\d+)点体力"), r"restores \1 stamina"),
    (re.compile(r"恢复(\d+\.?\d*)%生命值"), r"restores \1% HP"),
    (re.compile(r"恢复(\d+)点韧性"), r"restores \1 toughness"),
    (re.compile(r"每秒恢复(\d+)点体力"), r"restores \1 stamina/s"),
    (re.compile(r"每秒回复(\d+)点体力"), r"restores \1 stamina/s"),
    (re.compile(r"额外消耗(\d+)体力"), r"consumes \1 extra stamina"),
    (re.compile(r"额外消耗(\d+)点体力"), r"consumes \1 extra stamina"),
    (re.compile(r"消耗(\d+)点体力"), r"consumes \1 stamina"),
    (re.compile(r"负重达到(\d+\.?\d*)%之前"), r"when carry weight below \1%"),
    (re.compile(r"负重达到(\d+\.?\d*)%之后"), r"when carry weight above \1%"),
    (re.compile(r"获得(\d+)秒霸体"), r"gains \1s super armor"),
    (re.compile(r"获得(\d+)s霸体"), r"gains \1s super armor"),
    (re.compile(r"免疫本次硬直效果"), r"immune to this stagger"),
    (re.compile(r"免疫本次硬直"), r"immune to this stagger"),
    (re.compile(r"受到硬直效果时"), r"when staggered"),
    (re.compile(r"返还(\d+\.?\d*)%伤害给攻击者"), r"reflects \1% damage to attacker"),
    (re.compile(r"返还本次伤害的(\d+\.?\d*)%给攻击者"), r"reflects \1% of the damage to attacker"),
    (re.compile(r"对攻击者造成基于自身攻击力(\d+\.?\d*)%的伤害"), r"deals \1% of own attack as damage to attacker"),
    (re.compile(r"清除自身天赋的冷却状态"), r"resets own trait cooldowns"),
    (re.compile(r"所有天赋无法触发"), r"all traits cannot trigger"),
    (re.compile(r"所有概率触发的天赋概率提升(\d+\.?\d*)%"), r"all trait trigger chances increased by \1%"),
    (re.compile(r"所有概率触发的天赋必定触发"), r"all trait triggers are guaranteed"),
    (re.compile(r"触发概率降低(\d+\.?\d*)%"), r"trigger chance decreased by \1%"),
    (re.compile(r"攻击命中目标时"), r"on hit"),
    (re.compile(r"成功闪避敌人攻击后"), r"after dodging an attack"),
    (re.compile(r"成功防御敌人的攻击后"), r"after blocking an attack"),
    (re.compile(r"成功防御攻击"), r"after blocking an attack"),
    (re.compile(r"成功弹反敌人的攻击后"), r"after parrying an attack"),
    (re.compile(r"弹反敌人攻击时"), r"when parrying an attack"),
    (re.compile(r"弹反敌人的攻击"), r"parry an attack"),
    (re.compile(r"防御敌人攻击时"), r"when blocking"),
    (re.compile(r"防御敌人攻击后"), r"after blocking"),
    (re.compile(r"防御敌人的攻击"), r"block an attack"),
    (re.compile(r"防御近距离攻击"), r"block a close-range attack"),
    (re.compile(r"受到攻击时"), r"when attacked"),
    (re.compile(r"受到攻击后"), r"after being attacked"),
    (re.compile(r"攻击到目标弱点部位时"), r"when hitting a weak point"),
    (re.compile(r"攻击到目标四肢部位时"), r"when hitting a limb"),
    (re.compile(r"攻击到目标躯干部位时"), r"when hitting the torso"),
    (re.compile(r"攻击到目标头部时"), r"when hitting the head"),
    (re.compile(r"攻击到目标尾部时"), r"when hitting the tail"),
    (re.compile(r"被攻击到弱点部位时"), r"when hit on a weak point"),
    (re.compile(r"部位伤害降低(\d+\.?\d*)%"), r"body part damage reduced by \1%"),
    (re.compile(r"部位伤害提升(\d+\.?\d*)%"), r"body part damage increased by \1%"),
    (re.compile(r"移动时脚步声音降低(\d+\.?\d*)%"), r"footstep sound reduced by \1% while moving"),
    (re.compile(r"移动时脚步发出的声音提高(\d+\.?\d*)%"), r"footstep sound increased by \1% while moving"),
    (re.compile(r"发出所有声音降低(\d+\.?\d*)%"), r"all sounds reduced by \1%"),
    (re.compile(r"发出的所有声音提高(\d+\.?\d*)%"), r"all sounds increased by \1%"),
    (re.compile(r"警戒增长速度降低(\d+\.?\d*)%"), r"alert growth rate reduced by \1%"),
    (re.compile(r"警戒增长速度提高(\d+\.?\d*)%"), r"alert growth rate increased by \1%"),
    (re.compile(r"面临危险产生反应的概率提升(\d+\.?\d*)%"), r"danger reaction chance increased by \1%"),
    (re.compile(r"面临危险产生自保反应的几率降低(\d+\.?\d*)%"), r"danger reaction chance decreased by \1%"),
    (re.compile(r"体力恢复量降低(\d+\.?\d*)%"), r"stamina regen reduced by \1%"),
    (re.compile(r"包扎时间缩短(\d+\.?\d*)%"), r"bandage time reduced by \1%"),
    (re.compile(r"包扎时间延长(\d+\.?\d*)%"), r"bandage time increased by \1%"),
    (re.compile(r"蓄力时间缩短(\d+\.?\d*)%"), r"charge time reduced by \1%"),
    (re.compile(r"蓄力时间延长(\d+\.?\d*)%"), r"charge time increased by \1%"),
    (re.compile(r"装填速度缩短(\d+\.?\d*)%"), r"reload speed reduced by \1%"),
    (re.compile(r"装填速度延长(\d+\.?\d*)%"), r"reload speed increased by \1%"),
    (re.compile(r"再生时间缩短(\d+\.?\d*)%"), r"respawn time reduced by \1%"),
    (re.compile(r"产量提升(\d+\.?\d*)%"), r"yield increased by \1%"),
    (re.compile(r"耐久损耗降低(\d+\.?\d*)%"), r"durability loss reduced by \1%"),
    (re.compile(r"体力消耗降低(\d+\.?\d*)%"), r"stamina cost reduced by \1%"),
    (re.compile(r"体力消耗提升(\d+\.?\d*)%"), r"stamina cost increased by \1%"),
    (re.compile(r"对(\d+)米内敌人造成的伤害提升(\d+\.?\d*)%"), r"damage to enemies within \1m increased by \2%"),
    (re.compile(r"对(\d+)米内的敌人伤害降低(\d+\.?\d*)%"), r"damage to enemies within \1m decreased by \2%"),
    (re.compile(r"对(\d+)米外敌人造成的伤害提升(\d+\.?\d*)%"), r"damage to enemies beyond \1m increased by \2%"),
    (re.compile(r"对(\d+)米外的敌人伤害降低(\d+\.?\d*)%"), r"damage to enemies beyond \1m decreased by \2%"),
    (re.compile(r"背包格子数量提升(\d+)格"), r"backpack slots increased by \1"),
    (re.compile(r"比常人大(\d+)分贝的声音才能听到"), r"can only hear sounds \1dB louder than normal"),
    (re.compile(r"能够听到的声音比常人低(\d+)分贝"), r"can hear sounds \1dB quieter than normal"),
    (re.compile(r"使用弓类武器瞄准时的移动速度降低(\d+\.?\d*)%"), r"movement speed while aiming bows decreased by \1%"),

    # --- resistance patterns ---
    (re.compile(r"寒冷抗性提升(\d+\.?\d*)%"), r"cold resistance increased by \1%"),
    (re.compile(r"炎热抗性提升(\d+\.?\d*)%"), r"heat resistance increased by \1%"),
    (re.compile(r"辐射抗性提升(\d+\.?\d*)%"), r"radiation resistance increased by \1%"),
    (re.compile(r"昏迷、麻痹、流血抗性提升(\d+\.?\d*)%"), r"stun, paralyze, and bleed resistance increased by \1%"),
    (re.compile(r"流血抗性提升(\d+\.?\d*)%"), r"bleed resistance increased by \1%"),
    (re.compile(r"中毒抗性提升(\d+\.?\d*)%"), r"poison resistance increased by \1%"),

    # --- common phrases ---
    (re.compile(r"不会被造成暴击"), r"cannot be crit"),
    (re.compile(r"在此期间"), r"during this time"),
    (re.compile(r"每秒恢复基于自身防御力(\d+\.?\d*)%的生命"), r"restores \1% of own defense as HP per second"),
    (re.compile(r"每秒恢复基于自身攻击力(\d+\.?\d*)%的生命值"), r"restores \1% of own attack as HP per second"),
    (re.compile(r"额外流失最大生命的(\d+\.?\d*)%"), r"additionally loses \1% of max HP"),
    (re.compile(r"至多(\d+)点"), r"up to \1"),
    (re.compile(r"濒死"), r"near-death"),
    (re.compile(r"霸体"), r"super armor"),
    (re.compile(r"友方族人"), r"allied tribesmen"),
    (re.compile(r"友方单位"), r"allied units"),
    (re.compile(r"友方"), r"allies"),
    (re.compile(r"敌人"), r"enemies"),
    (re.compile(r"目标"), r"target"),
    (re.compile(r"自身"), r"self"),
    (re.compile(r"自己"), r"self"),
]

# Flavor text translations (the intro part before the mechanical effect)
FLAVOR_MAP = {
    "步伐迅捷": "Quick steps",
    "攻势凌厉": "Fierce assault",
    "天生蛮力": "Natural brute force",
    "防御能力异于常人": "Exceptional defensive ability",
    "皮糙肉厚天生抗揍": "Thick-skinned and naturally tough",
    "脚步轻盈": "Light footsteps",
    "轻手轻脚": "Light-footed",
    "擅于伪装不易察觉": "Skilled at camouflage and hard to detect",
    "对背负重物颇有心得": "Experienced at carrying heavy loads",
    "身体储备食物更多更加耐饿": "Stores more food and resists hunger",
    "身体储备水分更多更加耐渴": "Stores more water and resists thirst",
    "视力非凡": "Extraordinary vision",
    "听力敏感": "Sensitive hearing",
    "气血旺盛": "Vigorous vitality",
    "面色红润有光泽": "Healthy complexion",
    "食物消化更慢": "Slower food digestion",
    "水分吸收慢": "Slower water absorption",
    "善于反思过往": "Good at reflecting on past experiences",
    "使用单刀威力更强": "More powerful with swords",
    "使用长矛威力更强": "More powerful with spears",
    "使用弓箭威力更强": "More powerful with bows",
    "使用大锤威力更强": "More powerful with hammers",
    "使用拳套威力更强": "More powerful with gauntlets",
    "使用巨剑威力更强": "More powerful with greatswords",
    "使用双刀威力更强": "More powerful with dual blades",
    "使用刺鞭威力更强": "More powerful with whips",
    "皮厚刺不透": "Skin too thick to pierce",
    "皮韧砍不开": "Skin too tough to slash",
    "皮硬砸不疼": "Skin too hard to bruise",
    "热衷于近身缠斗": "Enjoys close combat",
    "距离拉开攻势更猛": "More powerful at range",
    "众神赋予的特殊运气": "Special luck granted by the gods",
    "难以抵抗戳刺": "Vulnerable to piercing",
    "难以忍受挥砍": "Vulnerable to slashing",
    "难以承受钝击": "Vulnerable to blunt force",
    "腿脚迟缓": "Sluggish legs",
    "攻势绵弱": "Weak assault",
    "手无缚猪之力": "Powerless",
    "空门大开": "Wide open defense",
    "身体脆弱极易受伤": "Fragile body, easily injured",
    "看起来比常人虚弱": "Appears weaker than normal",
    "脚步声音很大": "Loud footsteps",
    "未见其人先闻其声": "Heard before seen",
    "行为招摇易被发现": "Conspicuous behavior, easily spotted",
    "背负重物毫无技巧": "No skill at carrying loads",
    "胃口很小只能吃一点食物": "Small appetite, can only eat a little",
    "胃口很小只能喝一点水": "Small capacity, can only drink a little",
    "眼神很差": "Poor eyesight",
    "自愈能力很差": "Poor self-healing ability",
    "身心懒惰": "Physically and mentally lazy",
    "吃的多又拉的快": "Eats a lot and digests fast",
    "喝的多排的也快": "Drinks a lot and expels fast",
    "很难从经历中获取更多经验教训": "Struggles to learn from experience",
    "使用单刀威胁减弱": "Less threatening with swords",
    "使用长矛威胁减弱": "Less threatening with spears",
    "使用弓箭威胁减弱": "Less threatening with bows",
    "使用大锤威胁减弱": "Less threatening with hammers",
    "使用拳套威胁减弱": "Less threatening with gauntlets",
    "使用巨剑威胁减弱": "Less threatening with greatswords",
    "使用双刀威胁减弱": "Less threatening with dual blades",
    "发力技巧非常粗糙": "Very crude technique",
    "很不擅长近身肉搏": "Very poor at close combat",
    "很不擅长远程打击": "Very poor at ranged combat",
    "被霉运之神眷顾": "Cursed by the god of misfortune",
    "死亡总是慢我一小步": "Always one step ahead of death",
    "这副躯体承受了太多太多": "This body has endured far too much",
}

# Mood description components for XiHao traits
MOOD_POSITIVE_TAIL = re.compile(
    r"获得(\d+)点心情值?，并在(\d+)分钟内心情值下降速率降低(\d+)%，获得心情值时提升(\d+)%。"
    r"(?:（在此期间可使心情达到非常愉快状态）)?"
)
MOOD_NEGATIVE_TAIL = re.compile(
    r"心情值下降(\d+)点，并在(\d+)分钟内心情值下降速率提升(\d+)%，获得心情值时降低(\d+)%。"
    r"(?:（在此期间可使心情达到非常沮丧状态）)?"
)
MOOD_VERY_HAPPY = "（在此期间可使心情达到非常愉快状态）"
MOOD_VERY_SAD = "（在此期间可使心情达到非常沮丧状态）"


def translate_description(desc_zh: str, name_zh: str = "") -> str | None:
    """Translate a trait description from Chinese to English using pattern matching."""
    if not desc_zh:
        return None

    # Check overrides first
    if desc_zh in DESC_OVERRIDES:
        return DESC_OVERRIDES[desc_zh]

    result = desc_zh

    # Strip and translate class-exclusive prefixes
    prefix_en = ""
    for zh, en in CLASS_PREFIX.items():
        if result.startswith(zh):
            prefix_en = en
            result = result[len(zh):]
            break

    # Try mood description pattern (XiHao traits)
    m_pos = MOOD_POSITIVE_TAIL.search(result)
    m_neg = MOOD_NEGATIVE_TAIL.search(result)

    if m_pos:
        before = result[:m_pos.start()].rstrip("，,")
        pts, mins, decay_red, gain_inc = m_pos.groups()
        has_very_happy = MOOD_VERY_HAPPY in desc_zh
        en_tail = (
            f"gains {pts} mood, mood decay reduced by {decay_red}% for {mins} min, "
            f"mood gain increased by {gain_inc}%."
        )
        if has_very_happy:
            en_tail += " (Can reach Very Happy state)"
        before_en = _translate_flavor(before)
        return f"{prefix_en}{before_en}, {en_tail}".strip()

    if m_neg:
        before = result[:m_neg.start()].rstrip("，,")
        pts, mins, decay_inc, gain_red = m_neg.groups()
        has_very_sad = MOOD_VERY_SAD in desc_zh
        en_tail = (
            f"loses {pts} mood, mood decay increased by {decay_inc}% for {mins} min, "
            f"mood gain reduced by {gain_red}%."
        )
        if has_very_sad:
            en_tail += " (Can reach Very Depressed state)"
        before_en = _translate_flavor(before)
        return f"{prefix_en}{before_en}, {en_tail}".strip()

    # General clause-level translation
    # Split by Chinese comma/period, translate each clause
    result = _translate_clauses(result)

    return f"{prefix_en}{result}".strip() if result != desc_zh else None


def _translate_flavor(text: str) -> str:
    """Translate a flavor text fragment."""
    text = text.strip()
    if text in FLAVOR_MAP:
        return FLAVOR_MAP[text]

    # Try common XiHao intro patterns
    for zh, en in XIHAO_INTROS.items():
        if zh in text:
            return text.replace(zh, en)

    # Return original if no match
    return text


# XiHao description intro patterns
XIHAO_INTROS = {
    "每当吃到能填饱肚子的食物便感到身心舒畅": "Feels refreshed when eating filling food",
    "喜欢吃肉，吃到肉食身心舒畅": "Enjoys meat, feels refreshed when eating meat",
    "肉食狂热，吃到肉食十分满足": "Meat fanatic, very satisfied when eating meat",
    "喜欢酱熟肉，吃到酱熟肉时身心舒畅": "Enjoys braised meat, feels refreshed when eating it",
    "对酱熟肉极度热爱，吃到酱熟肉时十分满足": "Loves braised meat, very satisfied when eating it",
    "喜欢吃番茄，吃到番茄时身心舒畅": "Enjoys tomatoes, feels refreshed when eating them",
    "对番茄极度热爱，吃到番茄时十分满足": "Loves tomatoes, very satisfied when eating them",
    "喜欢吃水果蔬菜，吃到合适的食物时身心舒畅": "Enjoys fruits and vegetables, feels refreshed when eating them",
    "水果蔬菜狂热，吃到水果蔬菜时十分满足": "Fruit and vegetable fanatic, very satisfied when eating them",
    "喜欢烟草的味道，抽烟时身心舒畅": "Enjoys the taste of tobacco, feels refreshed when smoking",
    "对烟草十分满足，吸食烟草时十分满足": "Very satisfied by tobacco, content when smoking",
    "喜欢饮酒，喝酒时身心舒畅": "Enjoys drinking, feels refreshed when drinking alcohol",
    "嗜酒如命，喝酒时十分满足": "Loves drinking, very satisfied when drinking alcohol",
    "晴朗的天气让人身心舒畅，晴天时": "Sunny weather is refreshing, on sunny days",
    "酷爱晴天，晴天时": "Loves sunny weather, on sunny days",
    "对雨天情有独钟，下雨时": "Has a fondness for rainy days, when it rains",
    "雨天令人着迷，下雨时": "Fascinated by rainy days, when it rains",
    "对雪天情有独钟，下雪时": "Has a fondness for snowy days, when it snows",
    "雪天令人着迷，下雪时": "Fascinated by snowy days, when it snows",
    "跳舞似乎能忘记烦恼，跳舞时": "Dancing seems to wash away worries, when dancing",
    "跳舞令人着迷，跳舞时": "Fascinated by dancing, when dancing",
    "洗澡使人心情愉悦": "Bathing brings joy",
    "爱上洗澡无法自拔": "Addicted to bathing",
    "排泄使人愉快，排泄时会": "Defecation brings joy, when defecating",
    "享受排泄的快感，排泄时": "Enjoys the pleasure of defecation, when defecating",
    "睡眠对其尤为重要，每次得到休息时身心舒畅": "Sleep is especially important, feels refreshed when resting",
    "嗜睡如命，每次得到休息时十分满足": "Sleep fanatic, very satisfied when resting",
    "喜欢在人多的地方生活，部落人数超过": "Likes living in crowded places, when tribe has more than",
    "享受群居的热闹氛围，部落人数超过": "Enjoys the lively atmosphere of groups, when tribe has more than",
    "感到清寒时产生特殊的生理反应": "Has a special reaction when feeling cool",
    "嗜好清寒，感到清寒时极度兴奋": "Loves cool weather, gets very excited when feeling cool",
    "感到温热时产生特殊的生理反应": "Has a special reaction when feeling warm",
    "嗜好温热，感到温热时极度兴奋": "Loves warm weather, gets very excited when feeling warm",
    "处在舒适温度下时身心舒畅": "Feels refreshed at comfortable temperatures",
    "享受舒适的温度令人满足": "Enjoys comfortable temperatures",
    "感到寒冷时产生特殊的生理反应": "Has a special reaction when feeling cold",
    "嗜好寒冷，感到寒冷时极度兴奋": "Loves cold weather, gets very excited when feeling cold",
    "感到炎热时产生特殊的生理反应": "Has a special reaction when feeling hot",
    "嗜好炎热，感到炎热时极度兴奋": "Loves hot weather, gets very excited when feeling hot",
    "该蛮人追随的首领是紫色及以上品质时": "When following a leader of purple quality or above",
    "该蛮人追随的首领是红色品质时令其倍感心安": "Feels greatly at ease when following a red quality leader",
    "该蛮人追随杰出品质以上的首领极度满足": "Extremely satisfied when following an outstanding or above leader",
    "喜欢皮质衣物的触感，穿戴皮质装备时身心舒畅": "Enjoys the feel of leather, feels refreshed when wearing leather",
    "酷爱皮质衣物，穿戴皮质装备时十分满足": "Loves leather clothing, very satisfied when wearing leather",
    "喜好骨制武器，装备骨制武器时身心舒畅": "Enjoys bone weapons, feels refreshed when equipped",
    "酷爱骨制武器，装备骨制武器时十分满足": "Loves bone weapons, very satisfied when equipped",
    "喜欢布质衣物的触感，穿戴布质装备时身心舒畅": "Enjoys the feel of cloth, feels refreshed when wearing cloth",
    "酷爱布质衣物，穿戴布质装备时十分满足": "Loves cloth clothing, very satisfied when wearing cloth",
    "喜好石制武器，装备石制武器时身心舒畅": "Enjoys stone weapons, feels refreshed when equipped",
    "酷爱石制武器，装备石制武器时十分满足": "Loves stone weapons, very satisfied when equipped",
    "喜欢青铜护甲带来的安全感，穿戴青铜护甲时身心舒畅": "Enjoys the security of bronze armor, feels refreshed when wearing it",
    "酷爱青铜护甲，穿戴青铜护甲时十分满足": "Loves bronze armor, very satisfied when wearing it",
    "喜好青铜武器，装备青铜武器时身心舒畅": "Enjoys bronze weapons, feels refreshed when equipped",
    "酷爱青铜武器，装备青铜武器时十分满足": "Loves bronze weapons, very satisfied when equipped",
    "喜欢生活在有水的地方，生活区域附近有水域时": "Enjoys living near water, when living area is near water",
    "嗜好傍水，生活区域附近有水域时": "Loves being near water, when living area is near water",
    "鞭打他人时产生快感": "Gets pleasure from whipping others",
    "被鞭打时产生快感": "Gets pleasure from being whipped",

    # Negative intros
    "吃到主食时会感到恶心": "Feels nauseous when eating staple food",
    "吃到主食时异常厌恶": "Extremely disgusted when eating staple food",
    "吃到肉类食物时": "When eating meat",
    "吃到酱熟肉时": "When eating braised meat",
    "吃到番茄时": "When eating tomatoes",
    "吃到果蔬时": "When eating fruits and vegetables",
    "抵触烟草的味道，吸食烟草时": "Dislikes the taste of tobacco, when smoking",
    "厌恶烟草的味道，吸食烟草时": "Hates the taste of tobacco, when smoking",
    "不喜欢酒水的气味，喝酒时": "Dislikes the smell of alcohol, when drinking",
    "晴朗的天气让人感到不适，晴天时": "Sunny weather feels uncomfortable, on sunny days",
    "酷热和刺眼的阳光令其极度烦躁，晴天时": "Extreme heat and glaring sun makes them very irritable, on sunny days",
    "雨天使人烦躁，下雨时": "Rainy days are irritating, when it rains",
    "对雨天极度厌恶，下雨时": "Extremely disgusted by rainy days, when it rains",
    "雪天的一切都让人厌烦，下雪时": "Everything about snowy days is annoying, when it snows",
    "对雪天极度厌恶，下雪时": "Extremely disgusted by snowy days, when it snows",
    "四肢不够协调对跳舞比较抵触，跳舞时": "Uncoordinated and reluctant about dancing, when dancing",
    "极度厌恶跳舞，跳舞时": "Extremely hates dancing, when dancing",
    "抵触洗澡，洗澡时": "Reluctant about bathing, when bathing",
    "极度厌恶洗澡，洗澡时": "Extremely hates bathing, when bathing",
    "装备皮质衣物时": "When wearing leather clothing",
    "极度厌恶皮质衣物，装备皮质装备时": "Extremely hates leather, when wearing leather",
    "装备骨制武器时": "When equipping bone weapons",
    "极度厌恶骨制武器，装备骨制武器时": "Extremely hates bone weapons, when equipping them",
    "抵触粗滥的服饰，装备布制衣物时": "Dislikes rough clothing, when wearing cloth",
    "厌恶粗滥的服饰，装备布制衣物时": "Hates rough clothing, when wearing cloth",
    "不喜欢粗糙的武器，装备石制武器时": "Dislikes crude weapons, when equipping stone weapons",
    "极度厌恶粗糙的武器，装备石制武器时": "Extremely hates crude weapons, when equipping stone weapons",
    "装备青铜护甲时": "When wearing bronze armor",
    "极度厌恶青铜护甲，穿戴青铜护甲时": "Extremely hates bronze armor, when wearing it",
    "装备青铜武器时": "When equipping bronze weapons",
    "极度厌恶青铜武器，装备青铜武器时": "Extremely hates bronze weapons, when equipping them",
    "每次起床时情绪很差": "In a bad mood every time when waking up",
    "起床使人烦躁厌恶": "Waking up is irritating and disgusting",
    "待在超过": "When in a tribe of more than",
    "厌恶群居，待在超过": "Hates living in groups, when in a tribe of more than",
    "该蛮人追随的首领是红色以下品质时会心生抵触": "Feels resistant when following a leader below red quality",
    "该蛮人追随的首领是紫色以下品质时心生极度厌恶": "Extremely disgusted when following a leader below purple quality",
    "厌恶被水浸湿的感觉，洗澡时": "Hates the feeling of being wet, when bathing",
    "抵触排泄，排泄时": "Reluctant about defecation, when defecating",
    "极度厌恶排泄行为，排泄时": "Extremely hates defecation, when defecating",
    "身处清寒的环境温度中时": "When in a cool environment",
    "极度抵触清寒，身处清寒的环境温度中时": "Extremely dislikes cool weather, when in a cool environment",
    "身处温热的环境温度中时": "When in a warm environment",
    "极度抵触温热，身处温热的环境温度中时": "Extremely dislikes warm weather, when in a warm environment",
    "身处炎热的环境温度中时": "When in a hot environment",
    "极度抵触炎热，身处炎热的环境温度中时": "Extremely dislikes hot weather, when in a hot environment",
    "身处寒冷的环境温度中时": "When in a cold environment",
    "极度抵触寒冷，身处寒冷的环境温度中时": "Extremely dislikes cold weather, when in a cold environment",
    "身处舒适的环境温度中时": "When at comfortable temperature",
    "极度抵触舒适温度，身处舒适的环境温度中时": "Extremely dislikes comfortable temperature",
    "生活区域周围有水域时": "When living area is near water",
    "极度抵触傍水，生活区域附近有水域时": "Extremely dislikes being near water, when living area is near water",

    # Animal proximity patterns
    "附近有羊驼或大羊驼存在时会感到愉快，每隔一段时间会": "Feels happy when alpacas or llamas are nearby, periodically",
    "对羊驼和大羊驼十分抵触，附近有此类动物存在时": "Strongly dislikes alpacas and llamas, when they are nearby",
    "对羊驼和大羊驼极度厌恶，附近有此类动物存在时": "Extremely hates alpacas and llamas, when they are nearby",
    "附近有豹子存在时会感到愉快，每隔一段时间会": "Feels happy when leopards are nearby, periodically",
    "对豹子十分抵触，附近有豹子存在时": "Strongly dislikes leopards, when they are nearby",
    "刻在骨子里的恐惧，附近有豹子存在时": "Deep-rooted fear, when leopards are nearby",
    "附近有鹦鹉存在时会感到愉快，每隔一段时间会": "Feels happy when parrots are nearby, periodically",
    "附近有猴子存在时，每隔一段时间会": "When monkeys are nearby, periodically",
    "附近有鸵鸟存在时会感到愉快，每隔一段时间会": "Feels happy when ostriches are nearby, periodically",
    "附近有骆驼时会感到愉快，每隔一段时间": "Feels happy when camels are nearby, periodically",
    "附近有驴时会感到愉快，每隔一段时间": "Feels happy when donkeys are nearby, periodically",
    "附近有犀牛时会感到愉快，每隔一段时间": "Feels happy when rhinos are nearby, periodically",
    "附近有河马时会感到愉快，每隔一段时间": "Feels happy when hippos are nearby, periodically",
    "附近有火烈鸟时会感到愉快，每隔一段时间": "Feels happy when flamingos are nearby, periodically",
    "附近有长角牛时会感到愉快，每隔一段时间": "Feels happy when longhorn cattle are nearby, periodically",
    "附近有犰狳蜥时会感到愉快，每隔一段时间": "Feels happy when armadillo lizards are nearby, periodically",
    "附近有食人鱼时会感到愉快，每隔一段时间": "Feels happy when piranhas are nearby, periodically",
    "附近有鸡时会感到愉快，每隔一段时间": "Feels happy when chickens are nearby, periodically",
    "附近有象龟时会感到愉快，每隔一段时间": "Feels happy when tortoises are nearby, periodically",
    "附近有巨象时会感到愉快，每隔一段时间": "Feels happy when elephants are nearby, periodically",
    "附近有野猪时会感到愉快，每隔一段时间": "Feels happy when boars are nearby, periodically",
    "附近存在任何动物时都会感到愉快，每隔一段时间": "Feels happy when any animal is nearby, periodically",
}


def _translate_clauses(text: str) -> str:
    """Apply clause-level pattern translations to a description."""
    result = text

    # Apply flavor text translations
    for zh, en in FLAVOR_MAP.items():
        if result.startswith(zh):
            result = en + result[len(zh):]
            break

    # Apply all clause patterns
    for pattern, replacement in CLAUSE_PATTERNS:
        result = pattern.sub(replacement, result)

    # Translate remaining Chinese punctuation
    result = result.replace("，", ", ")
    result = result.replace("。", ".")
    result = result.replace("（", " (")
    result = result.replace("）", ")")
    result = result.replace("、", ", ")
    result = result.replace("；", "; ")

    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    traits_path = PARSED / "traits.json"
    if not traits_path.exists():
        print(f"ERROR: {traits_path} not found. Run parse_traits.py first.")
        sys.exit(1)

    traits = json.loads(traits_path.read_text())

    entries: dict[str, str] = {}
    name_ok = 0
    name_miss = 0
    desc_ok = 0
    desc_miss = 0
    missed_names: set[str] = set()

    for t in traits:
        tid = t["id"]
        name_zh = t.get("name_zh", "")
        desc_zh = t.get("description_zh", "")

        # Translate name
        name_en = translate_name(name_zh)
        if name_en:
            entries[f"trait:{tid}"] = name_en
            name_ok += 1
        else:
            if name_zh:
                missed_names.add(name_zh)
            name_miss += 1

        # Translate description
        desc_en = translate_description(desc_zh, name_zh)
        if desc_en:
            entries[f"trait_desc:{tid}"] = desc_en
            desc_ok += 1
        else:
            desc_miss += 1

    output = {
        "source": "claude-generated",
        "generated_at": "2026-04-30",
        "entries": entries,
    }

    out_path = TRANSLATIONS / "traits.json"
    out_path.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")

    print(f"Wrote {len(entries)} entries to {out_path}")
    print(f"  Names:        {name_ok} translated, {name_miss} missed")
    print(f"  Descriptions: {desc_ok} translated, {desc_miss} missed")

    if missed_names:
        print(f"\nMissed names ({len(missed_names)}):")
        for n in sorted(missed_names):
            print(f"  {n}")


if __name__ == "__main__":
    main()
