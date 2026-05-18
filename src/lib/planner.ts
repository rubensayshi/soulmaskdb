import type { Tribesman, TraitMatch, SlotState } from './types'

const MAX_SLOTS = 6

export function buildSlots(trainee: Tribesman): SlotState[] {
  const hexTraits = trainee.traits.filter(t => t.shape === 'hexagon')
  const slots: SlotState[] = hexTraits.slice(0, MAX_SLOTS).map(t => ({
    type: 'keep' as const,
    originalTrait: t,
  }))
  while (slots.length < MAX_SLOTS) {
    slots.push({ type: 'empty' as const })
  }
  return slots
}

export interface PoolTrait {
  id: string
  name: string
  icon_name: string
  eff: string
  star: number
  mentorCount: number
}

export function buildTraitPool(
  roster: Tribesman[],
  traineeClan: string,
  keptTraitIds: Set<string>,
  clanExclusiveIds?: Map<string, string>,
): PoolTrait[] {
  const mentors = roster.filter(tm => tm.level >= 50)
  const pool = new Map<string, PoolTrait>()

  for (const mentor of mentors) {
    for (const t of mentor.traits) {
      if (t.shape !== 'hexagon') continue
      if (keptTraitIds.has(t.id)) continue
      if (clanExclusiveIds) {
        const requiredClan = clanExclusiveIds.get(t.id)
        if (requiredClan && requiredClan !== traineeClan) continue
      }
      const existing = pool.get(t.id)
      if (existing) {
        existing.mentorCount++
        if (t.star > existing.star) {
          existing.star = t.star
          existing.name = t.name
          existing.eff = t.eff
          existing.icon_name = t.icon_name
        }
      } else {
        pool.set(t.id, {
          id: t.id,
          name: t.name,
          icon_name: t.icon_name,
          eff: t.eff,
          star: t.star,
          mentorCount: 1,
        })
      }
    }
  }

  return Array.from(pool.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export interface RankedMentor {
  tribesman: Tribesman
  desiredTraits: TraitMatch[]
  totalNormal: number
  score: number
}

export function rankMentors(
  roster: Tribesman[],
  desiredTraitIds: Set<string>,
): RankedMentor[] {
  const results: RankedMentor[] = []

  for (const tm of roster) {
    if (tm.level < 50) continue
    const normalTraits = tm.traits.filter(t => t.shape === 'hexagon')
    if (normalTraits.length === 0) continue
    const desired = normalTraits.filter(t => desiredTraitIds.has(t.id))
    if (desired.length === 0) continue
    results.push({
      tribesman: tm,
      desiredTraits: desired,
      totalNormal: normalTraits.length,
      score: desired.length / normalTraits.length,
    })
  }

  return results.sort((a, b) => b.score - a.score || b.desiredTraits.length - a.desiredTraits.length)
}
