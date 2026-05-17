export interface TraitMatch {
  icon_name: string
  confidence: number
}

export interface Tribesman {
  name: string
  level: number | null
  class: string | null
  clan: string | null
  title: string | null
  location: string | null
  traits: TraitMatch[]
  captured_at: string
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
