import type { Tribesman, Group, ClanName, StatusType, TraitMatch, BadgeShape } from './types'

export const GROUPS: Group[] = [
  { id: 'vanguard', name: 'Vanguard', hint: 'Frontline fighters' },
  { id: 'hearth', name: 'Hearth Crew', hint: 'Base caretakers' },
  { id: 'patrol', name: 'Long Patrol', hint: 'Scouts & rangers' },
  { id: 'forge', name: 'Forge Hands', hint: 'Smiths & crafters' },
  { id: 'foragers', name: 'Foragers', hint: 'Gatherers & farmers' },
  { id: 'unassigned', name: 'Unassigned', hint: 'No group set in-game' },
]

export const CLANS: Record<ClanName, { hue: string; label: string }> = {
  Claw:  { hue: 'var(--color-hue-claw)', label: 'Claw' },
  Flint: { hue: 'var(--color-hue-flint)', label: 'Flint' },
  Fang:  { hue: 'var(--color-hue-fang)', label: 'Fang' },
  Wolf:  { hue: 'var(--color-hue-wolf)', label: 'Wolf' },
  Horn:  { hue: 'var(--color-hue-horn)', label: 'Horn' },
  Exile: { hue: 'var(--color-hue-exile)', label: 'Exile' },
  DLC:   { hue: 'var(--color-hue-dlc)', label: 'DLC' },
}

export const STATUS_LABEL: Record<StatusType, string> = {
  idle: 'Idle',
  hosting: 'Hosting',
  mining: 'Mining',
  'work-break': 'Work Break',
  resting: 'Resting',
}

const TRAIT_DEFS: Record<string, { name: string; shape: BadgeShape; eff: string }> = {
  swift_pace:     { name: 'Swift Pace',       shape: 'hexagon', eff: 'Movement speed +3% per tier' },
  iron_will:      { name: 'Iron Will',        shape: 'hexagon', eff: 'Stamina drain reduced 8%' },
  chain_dodge:    { name: 'Chain Dodge',      shape: 'hexagon', eff: 'Dodge cooldown −0.5s' },
  battle_tested:  { name: 'Battle-Tested',    shape: 'hexagon', eff: 'XP gain +15% in combat' },
  crave_blood:    { name: 'Crave for Blood',  shape: 'hexagon', eff: 'Crit chance +4% below 50% HP' },
  steel_body:     { name: 'Steel Body',       shape: 'hexagon', eff: 'Heavy armor weight −20%' },
  refined_armor:  { name: 'Refined Armor',    shape: 'hexagon', eff: 'Armor crafting cost −10%' },
  refined_tool:   { name: 'Refined Tool',     shape: 'hexagon', eff: 'Tool crafting cost −10%' },
  firm_will:      { name: 'Firm Will',        shape: 'hexagon', eff: 'Insanity resist +12%' },
  getting_braver: { name: 'Getting Braver',   shape: 'hexagon', eff: 'Fear effects shortened 30%' },
  cold_blooded:   { name: 'Cold-Blooded',     shape: 'shield',  eff: 'Cold resistance +15%' },
  scorching:      { name: 'Scorching Resist', shape: 'shield',  eff: 'Heat resistance +15%' },
  radiation:      { name: 'Radiation Resist', shape: 'shield',  eff: 'Radiation resist +10%' },
  born_runner:    { name: 'Born Runner',      shape: 'shield',  eff: 'Sprint speed +6%' },
  hardened:       { name: 'Hardened',         shape: 'shield',  eff: 'Max HP +20' },
  nightborn:      { name: 'Nightborn',        shape: 'shield',  eff: 'Stealth at night +25%' },
  loves_meat:     { name: 'Loves Meat',       shape: 'diamond', eff: 'Cooked meat heals +20%' },
  hates_fish:     { name: 'Hates Fish',       shape: 'diamond', eff: 'Fish gives no satiety' },
  loves_steel:    { name: 'Loves Steel',      shape: 'diamond', eff: 'Steel weapons +8% dmg' },
  hates_bows:     { name: 'Hates Bows',       shape: 'diamond', eff: 'Bow proficiency gain −50%' },
  loves_mining:   { name: 'Loves Mining',     shape: 'diamond', eff: 'Mining XP +25%' },
  hates_farming:  { name: 'Hates Farming',    shape: 'diamond', eff: 'Farming XP −20%' },
  weapon_master:  { name: 'Weapon Master',    shape: 'shield',  eff: 'All weapons +5% dmg' },
  nightwalker:    { name: 'Nightwalker',      shape: 'shield',  eff: 'Night vision unlocked' },
  farming_expert: { name: 'Farming Expert',   shape: 'shield',  eff: 'Crop yield +30%' },
}

const TRAIT_IDS = Object.keys(TRAIT_DEFS)
const CLASSES = ['Skilled Laborer', 'Veteran Hunter', 'Master Hunter', 'Master Forager', 'Master Builder', 'War Chief']
const TITLES = ['Weapon Master', 'Nightwalker', 'Farming Expert', 'Forge Hand', 'Pathfinder', 'Hearthkeeper', 'Stonebreaker', '—']
const STATUSES: StatusType[] = ['idle', 'hosting', 'mining', 'work-break', 'resting']
const LOCS = ['Javis · Core', 'Zad · Swamps', 'Tafan · Peaks', 'Mokey · Plains', 'Ngolun · Forest', 'Yifa · Coast']

function pick<T>(arr: T[], i: number): T { return arr[i % arr.length] }
function shuf(arr: string[], seed: number): string[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = (seed * (i + 7) * 31) % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const NAMES = [
  'Animals ONLY', 'Base Sorter', 'Forge-Tongue', 'Kaela Stormbinder', 'Mokora the Quiet',
  'Pelt Walker', 'Reed of Tafan', 'Sava-Two-Knives', 'Snare-Twin', 'Tarn the Patient',
  'Veld Whisperer', 'Yarrow Bright', 'Brand of Zad', 'Ember Hauler', 'Hush',
  'Iron Cord', 'Knot of Lians', 'Long-Step', 'Petra Cinder', 'Quill',
  'Slow Drum', 'Tane Wolfkin', 'Vesh of Pines',
]

const CLAN_LIST: ClanName[] = ['Claw', 'Flint', 'Fang', 'Wolf', 'Horn', 'Exile', 'DLC']

export const MOCK_ROSTER: Tribesman[] = NAMES.map((name, i) => {
  const clan = CLAN_LIST[(i * 3 + 1) % CLAN_LIST.length]
  const level = 12 + ((i * 7) % 49)
  const traitCount = 6 + (i % 9)
  const tIds = shuf(TRAIT_IDS, i + 2).slice(0, traitCount)
  const traits: TraitMatch[] = tIds.map((id, k) => ({
    id,
    icon_name: id,
    name: TRAIT_DEFS[id].name,
    shape: TRAIT_DEFS[id].shape,
    eff: TRAIT_DEFS[id].eff,
    star: 1 + ((i + k) % 3),
    confidence: 0.7 + ((i + k * 3) % 30) / 100,
  }))
  const prof = Array.from({ length: 8 }, (_, k) => (i + k * 5 + 1) % 4)
  const groupIdx = (i * 5 + 3) % 7
  const group = groupIdx < GROUPS.length ? GROUPS[groupIdx].id : 'unassigned'
  return {
    id: 'tm' + i,
    name,
    level,
    klass: pick(CLASSES, i * 2),
    clan,
    group,
    title: pick(TITLES, i + 1),
    location: pick(LOCS, i),
    status: pick(STATUSES, i + 2),
    traits,
    prof,
  }
})

export const REVIEW_ITEMS = [
  {
    id: 'rev1', tribesman: 'Animals ONLY', field: 'trait', cropLabel: 'TRAIT ICON · 1',
    options: [
      { id: 'swift_pace', name: 'Swift Pace', pct: 62 },
      { id: 'chain_dodge', name: 'Chain Dodge', pct: 31 },
      { id: 'born_runner', name: 'Born Runner', pct: 7 },
    ],
    fixed: false,
    selected: null as string | null,
  },
  {
    id: 'rev2', tribesman: 'Pelt Walker', field: 'title', cropLabel: 'TITLE TEXT',
    options: [
      { id: 'farming_expert', name: 'Farming Expert', pct: 71 },
      { id: 'forge_hand', name: 'Forge Hand', pct: 22 },
      { id: 'hearthkeeper', name: 'Hearthkeeper', pct: 7 },
    ],
    fixed: false,
    selected: null as string | null,
  },
  {
    id: 'rev3', tribesman: 'Brand of Zad', field: 'class', cropLabel: 'CLASS LINE',
    options: [
      { id: 'master_hunter', name: 'Master Hunter', pct: 58 },
      { id: 'veteran_hunter', name: 'Veteran Hunter', pct: 35 },
      { id: 'war_chief', name: 'War Chief', pct: 7 },
    ],
    fixed: false,
    selected: null as string | null,
  },
  {
    id: 'rev4', tribesman: 'Quill', field: 'trait', cropLabel: 'TRAIT ICON · 5',
    options: [
      { id: 'iron_will', name: 'Iron Will', pct: 49 },
      { id: 'firm_will', name: 'Firm Will', pct: 44 },
      { id: 'hardened', name: 'Hardened', pct: 7 },
    ],
    fixed: false,
    selected: null as string | null,
  },
  {
    id: 'rev5', tribesman: 'Tane Wolfkin', field: 'group', cropLabel: 'GROUP TAG',
    options: [
      { id: 'patrol', name: 'Long Patrol', pct: 67 },
      { id: 'vanguard', name: 'Vanguard', pct: 24 },
      { id: 'unassigned', name: 'Unassigned', pct: 9 },
    ],
    fixed: false,
    selected: null as string | null,
  },
]
