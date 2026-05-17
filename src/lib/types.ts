export type ClanName = 'Claw' | 'Flint' | 'Fang' | 'Wolf' | 'Horn' | 'Exile' | 'DLC'
export type StatusType = 'idle' | 'hosting' | 'mining' | 'work-break' | 'resting'
export type BadgeShape = 'hexagon' | 'diamond' | 'shield'
export type LayoutMode = 'table' | 'cards' | 'split'

export interface TraitMatch {
  icon_name: string
  confidence: number
  id: string
  name: string
  shape: BadgeShape
  eff: string
  star: number
}

export interface Group {
  id: string
  name: string
  hint?: string
}

export interface Tribesman {
  id: string
  name: string
  level: number
  klass: string
  clan: ClanName
  group: string
  title: string
  location: string
  status: StatusType
  traits: TraitMatch[]
  prof: number[]
  captured_at?: string
}

export interface Roster {
  last_updated: string
  tribesmen: Tribesman[]
}

export interface ProcessResult {
  tribesmen: Tribesman[]
  cards_found: number
  error?: string
}

export interface TraitInfo {
  id: string
  star: number
  name_zh: string
  description_zh: string | null
  source: string
  icon_name: string
  is_negative: boolean
  clan: string | null
  effect_attr: string | null
  effect_value: number | null
  effect_is_percentage: boolean
}

export interface ProfFilter {
  skill: number
  min: number
}

export interface Filters {
  clan: ClanName | 'all'
  groups: string[]
  traits: string[]
  minLevel: number | null
  prof: ProfFilter | null
}

export interface SortState {
  key: string
  dir: 'asc' | 'desc'
}

export type SlotType = 'keep' | 'replace' | 'empty' | 'planned'
export type PlannerLayout = 'planner' | 'stepper'

export interface SlotState {
  type: SlotType
  originalTrait?: TraitMatch
  desiredTraitId?: string
}
