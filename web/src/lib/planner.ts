import type { TechTreeResponse, TechSubNode, TechMainNode, TechMode } from './types'

// --- Budget model ---

const POINTS_PER_LEVEL = 6
const MAX_LEVEL = 60

const TABLET_BRACKETS: [number, number][] = [
  [20, 20],
  [30, 20],
  [35, 13],
  [40, 13],
  [45, 13],
  [50, 14],
  [55, 13],
  [60, 14],
]

export function tabletPointsAtLevel(level: number): number {
  let total = 0
  for (const [maxLvl, pts] of TABLET_BRACKETS) {
    if (level >= maxLvl) total += pts
    else break
  }
  return total
}

export function cumulativePointsAtLevel(level: number): number {
  return level * POINTS_PER_LEVEL + tabletPointsAtLevel(level)
}

export const MAX_POINTS = cumulativePointsAtLevel(MAX_LEVEL)

export function estimateLevel(pointsSpent: number): { level: number; tablets: number } {
  for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
    if (cumulativePointsAtLevel(lvl) >= pointsSpent) {
      const fromLeveling = lvl * POINTS_PER_LEVEL
      const tablets = Math.max(0, pointsSpent - fromLeveling)
      return { level: lvl, tablets }
    }
  }
  return { level: MAX_LEVEL, tablets: tabletPointsAtLevel(MAX_LEVEL) }
}

// --- Data indexing ---

export interface PlannerIndex {
  subNodes: Map<string, TechSubNode>
  mainNodes: Map<string, TechMainNode>
  subToMain: Map<string, string>
  mainDeps: Map<string, string[]>
  mainToSubs: Map<string, string[]>
  allSubIds: string[]
}

export function buildPlannerIndex(data: TechTreeResponse): PlannerIndex {
  const subNodes = new Map<string, TechSubNode>()
  const mainNodes = new Map<string, TechMainNode>()
  const subToMain = new Map<string, string>()
  const mainDeps = new Map<string, string[]>()
  const mainToSubs = new Map<string, string[]>()
  const allSubIds: string[] = []

  const processMainNode = (mn: TechMainNode) => {
    mainNodes.set(mn.id, mn)
    mainDeps.set(mn.id, mn.depends_on || [])
    const subs: string[] = []
    for (const sub of mn.sub_nodes) {
      subNodes.set(sub.id, sub)
      subToMain.set(sub.id, mn.id)
      subs.push(sub.id)
      allSubIds.push(sub.id)
    }
    mainToSubs.set(mn.id, subs)
  }

  for (const tier of data.tiers) {
    for (const col of tier.columns) {
      for (const mn of col) processMainNode(mn)
    }
  }
  for (const mn of data.untiered) processMainNode(mn)

  allSubIds.sort()
  return { subNodes, mainNodes, subToMain, mainDeps, mainToSubs, allSubIds }
}

export function isAutoLearned(sub: TechSubNode): boolean {
  return sub.points == null || sub.points === 0
}

export function isMainNodeAutoSatisfied(mainId: string, idx: PlannerIndex): boolean {
  const subs = idx.mainToSubs.get(mainId) || []
  if (subs.length === 0) return true
  return subs.every(sid => {
    const sub = idx.subNodes.get(sid)
    return sub != null && isAutoLearned(sub)
  })
}

// --- Prerequisite resolution ---

export interface SelectionResult {
  additions: string[]
  totalCost: number
}

export function resolveSelect(
  subId: string,
  selected: Set<string>,
  idx: PlannerIndex,
): SelectionResult {
  const additions: string[] = []
  const visited = new Set<string>()

  const walkSubChain = (sid: string) => {
    if (visited.has(sid)) return
    visited.add(sid)
    const sub = idx.subNodes.get(sid)
    if (!sub || selected.has(sid) || isAutoLearned(sub)) return

    for (const depId of sub.depends_on || []) {
      walkSubChain(depId)
    }
    additions.push(sid)
  }

  walkSubChain(subId)

  const mainNodesNeeded = new Set<string>()
  const collectMainDeps = (mainId: string) => {
    if (mainNodesNeeded.has(mainId)) return
    if (isMainNodeAutoSatisfied(mainId, idx)) return
    const subs = idx.mainToSubs.get(mainId) || []
    const hasSelected = subs.some(s => selected.has(s) || additions.includes(s))
    if (hasSelected) return
    mainNodesNeeded.add(mainId)
    for (const dep of idx.mainDeps.get(mainId) || []) {
      collectMainDeps(dep)
    }
  }

  for (const sid of additions) {
    const mainId = idx.subToMain.get(sid)
    if (mainId) {
      for (const dep of idx.mainDeps.get(mainId) || []) {
        collectMainDeps(dep)
      }
    }
  }

  for (const mainId of mainNodesNeeded) {
    const subs = idx.mainToSubs.get(mainId) || []
    const selectableSubs = subs
      .map(s => idx.subNodes.get(s)!)
      .filter(s => !isAutoLearned(s) && !selected.has(s.id) && !additions.includes(s.id))
    if (selectableSubs.length > 0) {
      const cheapest = selectableSubs.reduce((a, b) =>
        (a.points ?? Infinity) <= (b.points ?? Infinity) ? a : b
      )
      if (!visited.has(cheapest.id)) {
        visited.add(cheapest.id)
        additions.push(cheapest.id)
      }
    }
  }

  const totalCost = additions.reduce((sum, sid) => {
    const sub = idx.subNodes.get(sid)
    return sum + (sub?.points ?? 0)
  }, 0)

  return { additions, totalCost }
}

export interface DeselectionResult {
  removals: string[]
  pointsRecovered: number
}

export function resolveDeselect(
  subId: string,
  selected: Set<string>,
  idx: PlannerIndex,
): DeselectionResult {
  const removals: string[] = [subId]
  const toRemove = new Set<string>([subId])

  let changed = true
  while (changed) {
    changed = false
    for (const sid of selected) {
      if (toRemove.has(sid)) continue
      const sub = idx.subNodes.get(sid)
      if (!sub) continue
      for (const depId of sub.depends_on || []) {
        if (toRemove.has(depId)) {
          toRemove.add(sid)
          removals.push(sid)
          changed = true
          break
        }
      }
    }

    for (const sid of selected) {
      if (toRemove.has(sid)) continue
      const mainId = idx.subToMain.get(sid)
      if (!mainId) continue
      for (const dep of idx.mainDeps.get(mainId) || []) {
        if (isMainNodeAutoSatisfied(dep, idx)) continue
        const depSubs = idx.mainToSubs.get(dep) || []
        const remaining = depSubs.filter(s => selected.has(s) && !toRemove.has(s))
        if (remaining.length === 0) {
          toRemove.add(sid)
          removals.push(sid)
          changed = true
          break
        }
      }
    }
  }

  const pointsRecovered = removals.reduce((sum, sid) => {
    const sub = idx.subNodes.get(sid)
    return sum + (sub?.points ?? 0)
  }, 0)

  return { removals: [...new Set(removals)], pointsRecovered }
}

// --- URL hash codec ---

export function encodeBuild(mode: TechMode, selected: Set<string>, allSubIds: string[]): string {
  const modeChar = mode === 'survival' ? 's' : mode === 'soldier' ? 'w' : 't'
  const bits: number[] = []
  for (const sid of allSubIds) {
    bits.push(selected.has(sid) ? 1 : 0)
  }
  const bytes: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8 && i + j < bits.length; j++) {
      byte |= bits[i + j] << (7 - j)
    }
    bytes.push(byte)
  }
  const binary = String.fromCharCode(...bytes)
  const b64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${modeChar}${b64}`
}

export function decodeBuild(
  hash: string,
  allSubIds: string[],
): { mode: TechMode; selected: Set<string> } | null {
  if (hash.length < 2) return null
  const modeChar = hash[0]
  const mode: TechMode = modeChar === 'w' ? 'soldier' : modeChar === 't' ? 'management' : 'survival'
  const b64 = hash.slice(1).replace(/-/g, '+').replace(/_/g, '/')
  const pad = (4 - (b64.length % 4)) % 4
  let binary: string
  try {
    binary = atob(b64 + '='.repeat(pad))
  } catch {
    return null
  }
  const selected = new Set<string>()
  for (let i = 0; i < allSubIds.length; i++) {
    const byteIdx = Math.floor(i / 8)
    const bitIdx = 7 - (i % 8)
    if (byteIdx < binary.length && (binary.charCodeAt(byteIdx) >> bitIdx) & 1) {
      selected.add(allSubIds[i])
    }
  }
  return { mode, selected }
}
