import { useState } from 'react'
import { REVIEW_ITEMS } from '../lib/data'
import { IcoCheck } from './Icons'

interface Props {
  onDone: () => void
}

export function ReviewScreen({ onDone }: Props) {
  const [picks, setPicks] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    REVIEW_ITEMS.forEach(it => { m[it.id] = it.options[0].id })
    return m
  })
  const [fixed, setFixed] = useState<Record<string, boolean>>({})

  function setPick(itemId: string, choice: string) {
    setPicks(p => ({ ...p, [itemId]: choice }))
    setFixed(f => ({ ...f, [itemId]: true }))
  }

  const remaining = REVIEW_ITEMS.filter(it => !fixed[it.id]).length
  const reviewed = REVIEW_ITEMS.length - remaining
  const pct = REVIEW_ITEMS.length > 0 ? (reviewed / REVIEW_ITEMS.length * 100) : 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="shrink-0"
        style={{
          padding: '22px 28px 18px',
          borderBottom: '1px solid var(--color-border-soft)',
          background: 'oklch(0.165 0.006 130 / 0.7)',
        }}
      >
        <div className="flex items-center gap-3.5 mb-1.5">
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-gold)',
            letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>
            ◆ Confidence below 80%
          </span>
        </div>
        <h2 style={{ margin: '0 0 4px', fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 600 }}>
          Review <em style={{ fontStyle: 'italic', color: 'var(--color-accent)', fontWeight: 500 }}>{REVIEW_ITEMS.length} items</em>
        </h2>
        <div style={{ color: 'var(--color-text-dim)', fontSize: 13, marginBottom: 14 }}>
          Verify the codex's best guesses, or pick a different match. Unreviewed items will use the highest-confidence option.
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-full overflow-hidden" style={{ flex: 1, maxWidth: 400, height: 4, background: 'var(--color-border-soft)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: pct + '%', background: 'var(--color-accent)', boxShadow: '0 0 8px var(--color-accent-glow)', transition: 'width 0.2s' }}
            />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--color-muted)', letterSpacing: '0.06em' }}>
            {reviewed} / {REVIEW_ITEMS.length} REVIEWED
          </span>
          <span className="flex-1" />
          <button className="btn-outline" onClick={onDone}>Skip remaining</button>
          <button className="btn-primary" onClick={onDone}>
            <IcoCheck size={12} /> Commit roster
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-auto content-scroll" style={{ padding: '0 28px' }}>
        {REVIEW_ITEMS.map(item => {
          const isFixed = fixed[item.id]
          return (
            <div
              key={item.id}
              className="grid items-center"
              style={{
                gridTemplateColumns: '160px 1fr auto',
                gap: 20,
                padding: '16px 0',
                borderBottom: '1px solid var(--color-border-soft)',
                opacity: isFixed ? 0.7 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {/* Crop placeholder */}
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-muted)', letterSpacing: '0.08em', marginBottom: 4 }}>
                  ◆ {item.cropLabel}
                </div>
                <div
                  className="grid place-items-center rounded"
                  style={{
                    height: 48,
                    background: 'repeating-linear-gradient(45deg, oklch(0.20 0.012 130) 0 6px, oklch(0.16 0.008 130) 6px 12px)',
                    border: '1px solid var(--color-border)',
                    fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-muted)', letterSpacing: '0.06em',
                  }}
                >
                  CROPPED REGION
                </div>
              </div>

              {/* Tribesman + options */}
              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16 }}>{item.tribesman}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    · {item.field}
                  </span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {item.options.map(o => {
                    const sel = picks[item.id] === o.id
                    return (
                      <button
                        key={o.id}
                        className="rounded transition-all"
                        style={{
                          padding: '5px 12px',
                          fontSize: 12,
                          border: `1px solid ${sel ? 'var(--color-accent-soft)' : 'var(--color-border-soft)'}`,
                          background: sel ? 'var(--color-accent-glow)' : 'transparent',
                          color: sel ? 'var(--color-accent)' : 'var(--color-text-dim)',
                        }}
                        onClick={() => setPick(item.id, o.id)}
                      >
                        {o.name}{' '}
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: sel ? 'var(--color-accent)' : 'var(--color-muted)' }}>
                          {o.pct}%
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Status */}
              <div style={{ textAlign: 'right' }}>
                {isFixed ? (
                  <span
                    className="inline-flex items-center gap-1.5"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                  >
                    <IcoCheck size={12} /> Confirmed
                  </span>
                ) : (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-gold)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    ◆ Awaiting
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
