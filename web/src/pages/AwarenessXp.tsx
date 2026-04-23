import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import type { Recipe, Item } from '../lib/types'

const TIERS: { lvl: number | null; label: string }[] = [
  { lvl: null, label: 'Stone' },
  { lvl: 1, label: 'Bone' },
  { lvl: 2, label: 'Bronze' },
  { lvl: 3, label: 'Iron' },
  { lvl: 4, label: 'Steel' },
]

const SKILLS = [
  'Alchemy', 'Armor Crafting', 'Cooking', 'Craftsman', 'Kiln',
  'Leatherworking', 'Plant', 'Potting', 'Weapon Crafting', 'Weaving', 'Wood & Stone',
]

const ROLES: { value: string; label: string }[] = [
  { value: 'final', label: 'Final' },
  { value: 'intermediate', label: 'Intermediate' },
]

interface Row {
  recipe: Recipe
  item: Item
  xpPerMin: number
}

function tierLabel(lvl: number | null | undefined): string {
  return TIERS.find(t => t.lvl === (lvl ?? null))?.label ?? '?'
}

function toggleInSet<T>(prev: Set<T>, val: T): Set<T> {
  const next = new Set(prev)
  next.has(val) ? next.delete(val) : next.add(val)
  return next
}

export default function AwarenessXp() {
  const graph = useStore(s => s.graph)
  const status = useStore(s => s.graphStatus)

  const [tierFilter, setTierFilter] = useState<Set<number | null>>(() => new Set())
  const [skillFilter, setSkillFilter] = useState<Set<string>>(() => new Set())
  const [roleFilter, setRoleFilter] = useState<Set<string>>(() => new Set())

  const itemById = useMemo(
    () => graph ? new Map(graph.items.map(i => [i.id, i])) : new Map<string, Item>(),
    [graph],
  )

  const rows = useMemo(() => {
    if (!graph) return []
    const result: Row[] = []
    for (const r of graph.recipes) {
      if (!r.awXp || !r.t || r.t <= 0) continue
      const item = itemById.get(r.out)
      if (!item) continue
      result.push({ recipe: r, item, xpPerMin: (r.awXp / r.t) * 60 })
    }
    result.sort((a, b) => b.xpPerMin - a.xpPerMin)
    return result
  }, [graph, itemById])

  const filtered = useMemo(() => {
    const hasTier = tierFilter.size > 0
    const hasSkill = skillFilter.size > 0
    const hasRole = roleFilter.size > 0
    return rows.filter(r => {
      if (hasTier && !tierFilter.has(r.recipe.lvl ?? null)) return false
      if (hasSkill && r.recipe.prof && r.recipe.prof !== 'None' && !skillFilter.has(r.recipe.prof)) return false
      if (hasRole && !roleFilter.has(r.item.role)) return false
      return true
    })
  }, [rows, tierFilter, skillFilter, roleFilter])

  if (status === 'loading' || !graph) return <div className="p-8 text-text-dim">Loading...</div>

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="font-display text-[24px] font-semibold text-text tracking-[.03em] mb-1">
        Top Awareness XP
      </h1>
      <p className="text-[12px] text-text-mute mb-5">
        Recipes ranked by awareness XP per minute of craft time.
      </p>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-6 p-4 bg-panel border border-hair">
        <FilterRow label="Tier">
          {TIERS.map(t => (
            <Toggle key={String(t.lvl)} label={t.label} active={tierFilter.has(t.lvl)} onClick={() => setTierFilter(prev => toggleInSet(prev, t.lvl))} />
          ))}
        </FilterRow>

        <FilterRow label="Skill">
          {SKILLS.map(s => (
            <Toggle key={s} label={s} active={skillFilter.has(s)} onClick={() => setSkillFilter(prev => toggleInSet(prev, s))} />
          ))}
        </FilterRow>

        <FilterRow label="Type">
          {ROLES.map(r => (
            <Toggle key={r.value} label={r.label} active={roleFilter.has(r.value)} onClick={() => setRoleFilter(prev => toggleInSet(prev, r.value))} />
          ))}
        </FilterRow>
      </div>

      {/* Table */}
      <div className="text-[12px]">
        <div className="grid grid-cols-[1fr_80px_70px_70px_80px_80px] gap-x-3 px-3 py-2 border-b border-hair-strong text-text-dim uppercase tracking-[.1em] text-[10px] font-medium">
          <span>Item</span>
          <span className="text-right">XP/min</span>
          <span className="text-right">XP</span>
          <span className="text-right">Time</span>
          <span className="text-right">Tier</span>
          <span className="text-right">Skill</span>
        </div>
        {filtered.length === 0 && (
          <div className="p-6 text-center text-text-dim italic">No recipes match the current filters.</div>
        )}
        {filtered.map((r, i) => (
          <Link
            key={r.recipe.id}
            to={`/item/${r.item.id}`}
            className={`grid grid-cols-[1fr_80px_70px_70px_80px_80px] gap-x-3 px-3 py-[7px] items-center border-b border-hair hover:bg-green-bg transition-colors ${i % 2 === 0 ? 'bg-panel' : ''}`}
          >
            <span className="text-text truncate">{r.item.n ?? r.item.nz ?? r.item.id}</span>
            <span className="text-right text-green-hi font-medium tabular-nums">{r.xpPerMin.toFixed(1)}</span>
            <span className="text-right text-text-mute tabular-nums">{r.recipe.awXp}</span>
            <span className="text-right text-text-mute tabular-nums">{r.recipe.t}s</span>
            <span className="text-right text-gold">{tierLabel(r.recipe.lvl)}</span>
            <span className="text-right text-text-dim truncate">{r.recipe.prof ?? '—'}</span>
          </Link>
        ))}
      </div>
      <div className="mt-3 text-[11px] text-text-dim">
        Showing {filtered.length} of {rows.length} recipes
      </div>
    </div>
  )
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-text-dim uppercase tracking-[.1em] font-medium w-12 flex-shrink-0">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-[3px] text-[11px] border transition-colors ${
        active
          ? 'bg-green-soft border-green-dim text-green-hi'
          : 'bg-transparent border-hair text-text-dim hover:border-hair-strong'
      }`}
    >
      {label}
    </button>
  )
}
