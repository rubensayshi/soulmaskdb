import type { SlotState, TraitMatch } from '../lib/types'
import { TraitBadge } from './TraitBadge'

interface Props {
  slot: SlotState
  index: number
  active: boolean
  useForgetfulness: boolean
  onToggleKeep: () => void
  onClick: () => void
  onClear: () => void
  traitLookup: Map<string, TraitMatch>
}

const SLOT_LEVELS = [10, 20, 30, 40, 50, 60]

export function TraitSlot({ slot, index, active, useForgetfulness, onToggleKeep, onClick, onClear, traitLookup }: Props) {
  if (slot.type === 'keep') {
    return (
      <div
        className="flex items-center gap-2 rounded-[var(--radius)]"
        style={{
          padding: '6px 8px',
          background: 'oklch(0.80 0.06 140 / 0.06)',
          border: '1px solid oklch(0.80 0.06 140 / 0.15)',
          cursor: useForgetfulness ? 'pointer' : 'default',
        }}
        onClick={useForgetfulness ? onToggleKeep : undefined}
      >
        <TraitBadge trait={slot.originalTrait!} size={20} withPips={false} />
        <div className="flex-1 min-w-0">
          <div className="truncate" style={{ fontSize: 12 }}>{slot.originalTrait!.name}</div>
          <Stars star={slot.originalTrait!.star} />
        </div>
        <span style={{ fontSize: 10, color: 'var(--color-accent)' }}>KEEP</span>
      </div>
    )
  }

  if (slot.type === 'replace') {
    return (
      <div
        className="flex items-center gap-2 rounded-[var(--radius)] cursor-pointer"
        style={{
          padding: '6px 8px',
          background: 'oklch(0.65 0.15 20 / 0.06)',
          border: '1px solid oklch(0.65 0.15 20 / 0.15)',
        }}
        onClick={onToggleKeep}
      >
        <TraitBadge trait={slot.originalTrait!} size={20} withPips={false} />
        <div className="flex-1 min-w-0">
          <div className="truncate" style={{ fontSize: 12, textDecoration: 'line-through', opacity: 0.5 }}>{slot.originalTrait!.name}</div>
        </div>
        <span style={{ fontSize: 10, color: 'oklch(0.65 0.15 20)' }}>REPLACE</span>
      </div>
    )
  }

  if (slot.type === 'planned') {
    const desired = traitLookup.get(slot.desiredTraitId!)
    return (
      <div
        className="flex items-center gap-2 rounded-[var(--radius)] cursor-pointer"
        style={{
          padding: '6px 8px',
          background: active ? 'oklch(0.55 0.08 165 / 0.12)' : 'oklch(0.55 0.08 165 / 0.06)',
          border: active ? '2px solid oklch(0.55 0.08 165 / 0.4)' : '1px dashed oklch(0.55 0.08 165 / 0.3)',
        }}
        onClick={onClick}
      >
        {desired && <TraitBadge trait={desired} size={20} withPips={false} />}
        <div className="flex-1 min-w-0">
          <div className="truncate" style={{ fontSize: 12, color: 'var(--color-accent)' }}>
            {desired?.name ?? slot.desiredTraitId}
          </div>
          {desired && <Stars star={desired.star} />}
        </div>
        <button
          className="grid place-items-center"
          style={{ width: 16, height: 16, color: 'var(--color-muted)', fontSize: 12 }}
          onClick={e => { e.stopPropagation(); onClear() }}
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-2 rounded-[var(--radius)] cursor-pointer"
      style={{
        padding: '6px 8px',
        border: active ? '2px solid oklch(0.55 0.08 165 / 0.3)' : '1px dashed oklch(0.92 0.018 95 / 0.1)',
        background: active ? 'oklch(0.55 0.08 165 / 0.04)' : undefined,
      }}
      onClick={onClick}
    >
      <svg width={20} height={20} viewBox="0 0 24 24">
        <path d="M12,1.5 L22,6.5 L22,17.5 L12,22.5 L2,17.5 L2,6.5 Z" fill="none" stroke="oklch(0.92 0.018 95 / 0.12)" strokeWidth="1.5" strokeDasharray="3,2" />
      </svg>
      <span style={{ fontSize: 12, opacity: 0.3 }}>
        Slot {index + 1} · unlocks Lv.{SLOT_LEVELS[index]}
      </span>
    </div>
  )
}

function Stars({ star }: { star: number }) {
  return (
    <span className="flex gap-[1.5px]">
      {[1, 2, 3].map(s => (
        <span
          key={s}
          className="rounded-full"
          style={{
            width: 3, height: 3,
            background: s <= star ? 'var(--color-gold)' : 'var(--color-faint)',
          }}
        />
      ))}
    </span>
  )
}
