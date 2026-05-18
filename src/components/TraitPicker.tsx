import { useMemo } from 'react'
import type { PoolTrait } from '../lib/planner'
import { IcoSearch } from './Icons'

interface Props {
  pool: PoolTrait[]
  search: string
  onSearchChange: (s: string) => void
  selectedIds: Set<string>
  onSelect: (id: string) => void
  activeSlotIdx: number | null
}

export function TraitPicker({ pool, search, onSearchChange, selectedIds, onSelect, activeSlotIdx }: Props) {
  const filtered = useMemo(() => {
    if (!search) return pool
    const q = search.toLowerCase()
    return pool.filter(t => t.name.toLowerCase().includes(q) || t.eff.toLowerCase().includes(q))
  }, [pool, search])

  const canPick = activeSlotIdx !== null

  return (
    <div className="flex flex-col gap-3 h-full" style={{ padding: 16 }}>
      <span
        className="uppercase"
        style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)', letterSpacing: '0.1em' }}
      >
        Available traits{' '}
        <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: '0.02em' }}>
          (from your roster's Lv.50+ mentors)
        </span>
      </span>

      <div
        className="flex items-center rounded-[var(--radius)]"
        style={{
          height: 30,
          background: 'oklch(0.18 0.008 130)',
          border: '1px solid var(--color-border-soft)',
          padding: '0 10px',
        }}
      >
        <IcoSearch />
        <input
          className="flex-1 bg-transparent border-0 outline-0 px-2"
          style={{ color: 'var(--color-text)', fontSize: 12, fontStyle: 'italic' }}
          placeholder="Search by name or effect..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto content-scroll flex flex-col gap-1">
        {filtered.length === 0 && (
          <div style={{ padding: '20px 0', color: 'var(--color-faint)', fontSize: 12, fontStyle: 'italic', textAlign: 'center' }}>
            {pool.length === 0
              ? 'No eligible mentors in roster (Lv.50+ required)'
              : 'No traits match your search.'}
          </div>
        )}
        {filtered.map(t => {
          const isSelected = selectedIds.has(t.id)
          return (
            <button
              key={t.id}
              className="flex items-center gap-2 rounded-[var(--radius)] text-left transition-colors"
              style={{
                padding: '8px 10px',
                background: isSelected ? 'oklch(0.55 0.08 165 / 0.08)' : 'oklch(0.19 0.008 130 / 0.4)',
                border: isSelected ? '1px solid oklch(0.55 0.08 165 / 0.25)' : '1px solid transparent',
                opacity: !canPick && !isSelected ? 0.5 : 1,
                cursor: canPick ? 'pointer' : 'default',
              }}
              onClick={() => canPick && onSelect(t.id)}
              disabled={!canPick && !isSelected}
            >
              <svg width={20} height={20} viewBox="0 0 24 24">
                <path
                  d="M12,1.5 L22,6.5 L22,17.5 L12,22.5 L2,17.5 L2,6.5 Z"
                  fill={isSelected ? 'oklch(0.20 0.02 165)' : 'oklch(0.20 0.02 165 / 0.5)'}
                  stroke={isSelected ? 'oklch(0.80 0.06 140)' : 'oklch(0.55 0.08 165)'}
                  strokeWidth="1"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate" style={{ fontSize: 13, color: isSelected ? 'var(--color-accent)' : undefined }}>
                    {t.name}
                  </span>
                  <Stars star={t.star} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 1 }}>{t.eff}</div>
              </div>
              <span style={{ fontSize: 11, color: isSelected ? 'var(--color-accent)' : 'var(--color-faint)', whiteSpace: 'nowrap' }}>
                {isSelected ? '✓ selected' : `${t.mentorCount} mentor${t.mentorCount !== 1 ? 's' : ''}`}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Stars({ star }: { star: number }) {
  return (
    <span className="inline-flex gap-[1.5px]" style={{ marginTop: 1 }}>
      {[1, 2, 3].map(s => (
        <span
          key={s}
          className="rounded-full"
          style={{ width: 3, height: 3, background: s <= star ? 'var(--color-gold)' : 'var(--color-faint)' }}
        />
      ))}
    </span>
  )
}
