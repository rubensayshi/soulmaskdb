import type { TraitInfo } from './types'
import traitsData from '../../assets/traits.json'

const traitsArray = traitsData as TraitInfo[]

const byIconName = new Map<string, TraitInfo[]>()
for (const t of traitsArray) {
  if (!t.icon_name) continue
  const arr = byIconName.get(t.icon_name) || []
  arr.push(t)
  byIconName.set(t.icon_name, arr)
}

export function getTraitsByIconName(iconName: string): TraitInfo[] {
  return byIconName.get(iconName) || []
}

export function getBestTrait(iconName: string): TraitInfo | null {
  const traits = getTraitsByIconName(iconName)
  if (!traits.length) return null
  return traits.reduce((a, b) => (b.star > a.star ? b : a))
}

export { traitsArray }
