import { useState } from 'react'
import type { Tribesman, SlotState, TraitMatch } from '../lib/types'
import { CLANS } from '../lib/data'
import { TraitSlot } from './TraitSlot'
import { IcoChevDown } from './Icons'

interface Props {
  roster: Tribesman[]
  traineeId: string | null
  onSelectTrainee: (id: string) => void
  slots: SlotState[]
  activeSlotIdx: number | null
  onSlotClick: (idx: number) => void
  onToggleKeep: (idx: number) => void
  onClearSlot: (idx: number) => void
  useForgetfulness: boolean
  onToggleForgetfulness: () => void
  traitLookup: Map<string, TraitMatch>
}

export function TraineePanel({
  roster, traineeId, onSelectTrainee, slots, activeSlotIdx,
  onSlotClick, onToggleKeep, onClearSlot, useForgetfulness,
  onToggleForgetfulness, traitLookup,
}: Props) {
  const trainee = roster.find(tm => tm.id === traineeId)
  const [dropOpen, setDropOpen] = useState(false)

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto content-scroll" style={{ padding: 16 }}>
      <span
        className="uppercase"
        style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)', letterSpacing: '0.1em' }}
      >
        Trainee
      </span>

      <div className="relative">
        <button
          className="flex items-center justify-between w-full rounded-[var(--radius)]"
          style={{
            padding: '8px 10px',
            background: 'oklch(0.19 0.008 130)',
            border: '1px solid var(--color-border)',
            fontSize: 13,
          }}
          onClick={() => setDropOpen(!dropOpen)}
        >
          <span className="truncate">
            {trainee ? trainee.name : 'Select a tribesman...'}
          </span>
          <IcoChevDown size={12} />
        </button>
        {dropOpen && (
          <div
            className="absolute left-0 right-0 rounded-[var(--radius)] overflow-y-auto content-scroll"
            style={{
              top: '100%',
              marginTop: 4,
              maxHeight: 240,
              background: 'oklch(0.19 0.008 130)',
              border: '1px solid var(--color-border)',
              zIndex: 50,
            }}
          >
            {roster.map(tm => (
              <button
                key={tm.id}
                className="flex items-center gap-2 w-full text-left hover:bg-bg-hover"
                style={{
                  padding: '8px 10px',
                  fontSize: 12,
                  background: tm.id === traineeId ? 'var(--color-accent-glow)' : undefined,
                }}
                onClick={() => { onSelectTrainee(tm.id); setDropOpen(false) }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CLANS[tm.clan].hue }} />
                <span className="truncate flex-1">{tm.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)' }}>
                  Lv.{tm.level} · {tm.clan}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {trainee && (
        <div style={{ fontSize: 11, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
          Lv.{trainee.level} · {trainee.clan} · {trainee.klass}
        </div>
      )}

      <div
        className="flex items-center gap-2 cursor-pointer"
        style={{ fontSize: 12 }}
        onClick={onToggleForgetfulness}
      >
        <div
          className="rounded-full transition-colors"
          style={{
            width: 32, height: 16,
            background: useForgetfulness ? 'var(--color-accent)' : 'var(--color-border-strong)',
            position: 'relative',
          }}
        >
          <div
            className="rounded-full transition-all"
            style={{
              width: 12, height: 12,
              background: 'white',
              position: 'absolute',
              top: 2,
              left: useForgetfulness ? 18 : 2,
            }}
          />
        </div>
        <span style={{ color: 'var(--color-text-dim)' }}>Forgetfulness potion</span>
      </div>

      <span
        className="uppercase"
        style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)', letterSpacing: '0.1em', marginTop: 4 }}
      >
        Trait slots
      </span>

      {trainee ? (
        <div className="flex flex-col gap-1.5">
          {slots.map((slot, i) => (
            <TraitSlot
              key={i}
              slot={slot}
              index={i}
              active={activeSlotIdx === i}
              useForgetfulness={useForgetfulness}
              onToggleKeep={() => onToggleKeep(i)}
              onClick={() => onSlotClick(i)}
              onClear={() => onClearSlot(i)}
              traitLookup={traitLookup}
            />
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--color-faint)', fontStyle: 'italic', padding: '20px 0' }}>
          Select a tribesman to plan their training.
        </div>
      )}
    </div>
  )
}
