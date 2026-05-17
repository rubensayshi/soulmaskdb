import { useState } from 'react'
import { TraitIcon } from './TraitIcon'
import { traitsArray } from '../lib/traits'
import { useRosterStore } from '../lib/store'
import type { TraitMatch } from '../lib/types'

interface Props {
  tribesmen: { name: string; traits: TraitMatch[] }[]
}

export function ReviewPanel({ tribesmen }: Props) {
  const lowConf = tribesmen.filter(t =>
    t.traits.some(tr => tr.confidence < 0.8)
  )
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const { updateTribesman } = useRosterStore()

  if (lowConf.length === 0) return null

  const visible = lowConf.filter(t => !dismissed.has(t.name))
  if (visible.length === 0) return null

  return (
    <div className="mb-6 p-4 bg-panel rounded-lg border border-gold/30">
      <h3 className="text-gold font-medium text-sm mb-3">
        Review needed — {visible.length} tribesman{visible.length !== 1 ? 's' : ''} with uncertain matches
      </h3>
      <div className="space-y-3">
        {visible.map(t => (
          <ReviewItem
            key={t.name}
            name={t.name}
            traits={t.traits}
            onDismiss={() => setDismissed(s => new Set(s).add(t.name))}
            onUpdate={(traits) => updateTribesman(t.name, { traits })}
          />
        ))}
      </div>
    </div>
  )
}

function ReviewItem({ name, traits, onDismiss, onUpdate }: {
  name: string
  traits: TraitMatch[]
  onDismiss: () => void
  onUpdate: (traits: TraitMatch[]) => void
}) {
  const [editing, setEditing] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const flagged = traits
    .map((tr, i) => ({ ...tr, index: i }))
    .filter(tr => tr.confidence < 0.8)

  function replaceTrait(index: number, newIconName: string) {
    const updated = [...traits]
    updated[index] = { icon_name: newIconName, confidence: 1.0 }
    onUpdate(updated)
    setEditing(null)
    setSearch('')
  }

  const filteredTraits = search
    ? traitsArray.filter(t =>
        t.icon_name.includes(search.toLowerCase()) ||
        t.name_zh.includes(search)
      ).slice(0, 10)
    : []

  return (
    <div className="flex items-start gap-3 p-2 bg-tile/50 rounded">
      <span className="text-text font-medium text-sm min-w-[120px]">{name}</span>
      <div className="flex gap-2 flex-wrap items-start">
        {flagged.map(tr => (
          <div key={tr.index} className="relative">
            <button
              onClick={() => setEditing(editing === tr.index ? null : tr.index)}
              className="border border-danger/40 rounded p-0.5"
            >
              <TraitIcon iconName={tr.icon_name} confidence={tr.confidence} size={28} showTooltip={false} />
            </button>
            <span className="text-danger text-[10px] block text-center">
              {Math.round(tr.confidence * 100)}%
            </span>
            {editing === tr.index && (
              <div className="absolute z-50 top-full left-0 mt-1 bg-panel border border-green/20 rounded shadow-lg p-2 w-56">
                <input
                  type="text"
                  placeholder="Search trait..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-tile border border-green/20 rounded px-2 py-1 text-xs text-text mb-1"
                  autoFocus
                />
                <div className="max-h-32 overflow-y-auto">
                  {filteredTraits.map(t => (
                    <button
                      key={t.id}
                      onClick={() => replaceTrait(tr.index, t.icon_name)}
                      className="flex items-center gap-2 w-full px-1 py-0.5 hover:bg-tile rounded text-xs text-left"
                    >
                      <TraitIcon iconName={t.icon_name} size={20} showTooltip={false} />
                      <span>{t.name_zh}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={onDismiss}
        className="ml-auto text-text-dim hover:text-text text-xs"
      >
        Dismiss
      </button>
    </div>
  )
}
