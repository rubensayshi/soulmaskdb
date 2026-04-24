import { useMemo, useState } from 'react'
import type { DropSource } from '../lib/types'

const SOURCE_TYPE_LABELS: Record<string, string> = {
  creature_body: 'Creatures',
  npc: 'NPCs',
  npc_dlc: 'NPCs (DLC)',
  plant: 'Gathering',
  tribe: 'Tribe Chests',
  tribe_dlc: 'Tribe Chests (DLC)',
  ruins: 'Ruins',
  relic_dlc: 'Relics (DLC)',
  item_bag: 'Item Bags',
  underground_city: 'Underground City',
  dungeon_dlc: 'Dungeons (DLC)',
}

const TYPE_ORDER = Object.keys(SOURCE_TYPE_LABELS)

interface Props {
  sources: DropSource[]
}

export default function ObtainedFrom({ sources }: Props) {
  const grouped = useMemo(() => {
    const m = new Map<string, Map<string, DropSource>>()
    for (const s of sources) {
      if (!m.has(s.source_type)) m.set(s.source_type, new Map())
      const byName = m.get(s.source_type)!
      const existing = byName.get(s.source_name)
      if (!existing || s.probability > existing.probability) {
        byName.set(s.source_name, s)
      }
    }
    return m
  }, [sources])

  const sortedTypes = useMemo(() =>
    [...grouped.keys()].sort((a, b) => {
      const ai = TYPE_ORDER.indexOf(a)
      const bi = TYPE_ORDER.indexOf(b)
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    }),
    [grouped]
  )

  const [selected, setSelected] = useState<Set<string>>(() =>
    grouped.has('creature_body') && grouped.size > 1
      ? new Set(['creature_body'])
      : new Set()
  )

  if (!sources.length) return null

  const visible = selected.size === 0 ? sortedTypes : sortedTypes.filter(t => selected.has(t))

  return (
    <div className="space-y-3 mb-4">
      {sortedTypes.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          <button
            onClick={() => setSelected(new Set())}
            className={`px-2.5 py-[3px] text-[10px] tracking-[.08em] uppercase font-medium border transition-colors ${
              selected.size === 0
                ? 'bg-rust/20 border-rust text-rust'
                : 'bg-panel border-hair text-text-dim hover:text-text hover:border-text-dim'
            }`}
          >
            All
          </button>
          {sortedTypes.map(type => {
            const active = selected.has(type)
            const count = grouped.get(type)!.size
            return (
              <button key={type}
                onClick={() => setSelected(prev => {
                  const next = new Set(prev)
                  if (next.has(type)) next.delete(type); else next.add(type)
                  if (next.size === 0 || next.size === sortedTypes.length) return new Set()
                  return next
                })}
                className={`px-2.5 py-[3px] text-[10px] tracking-[.08em] uppercase font-medium border transition-colors ${
                  active
                    ? 'bg-rust/20 border-rust text-rust'
                    : 'bg-panel border-hair text-text-dim hover:text-text hover:border-text-dim'
                }`}
              >
                {SOURCE_TYPE_LABELS[type] ?? type} <span className="tabular-nums opacity-60">{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {visible.map(type => {
        const label = SOURCE_TYPE_LABELS[type] ?? type
        const entries = [...grouped.get(type)!.values()].sort((a, b) => b.probability - a.probability)
        return (
          <div key={type}>
            <div className="text-[10px] tracking-[.12em] uppercase text-text-dim font-medium mb-1.5">{label}</div>
            <div className="space-y-0">
              {entries.map((s, i) => (
                <div key={i} className="flex items-center gap-3 text-[12px] py-[4px] border-b border-hair">
                  <span className="text-text flex-1">{s.source_name}</span>
                  <span className="text-text-dim tabular-nums w-[50px] text-right">{s.probability}%</span>
                  <span className="text-text-mute tabular-nums w-[60px] text-right">
                    {s.qty_min === s.qty_max ? `×${s.qty_min}` : `×${s.qty_min}–${s.qty_max}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
