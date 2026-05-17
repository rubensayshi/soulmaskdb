import { useState, useEffect } from 'react'
import { IcoCamera, IcoExport, IcoCheck, IcoX } from './Icons'
import { REVIEW_ITEMS } from '../lib/data'

interface Props {
  onClose: () => void
  onDone: (action?: 'review') => void
}

export function CaptureModal({ onClose, onDone }: Props) {
  const [phase, setPhase] = useState<'pick' | 'processing' | 'summary'>('pick')
  const [progress, setProgress] = useState(0)
  const shots = 3

  function startProcessing() {
    setPhase('processing')
    setProgress(0)
  }

  useEffect(() => {
    if (phase !== 'processing') return
    const t = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(t)
          setTimeout(() => setPhase('summary'), 300)
          return 100
        }
        return p + 2.5
      })
    }, 60)
    return () => clearInterval(t)
  }, [phase])

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center"
      style={{ background: 'oklch(0.10 0.01 130 / 0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-[var(--radius-lg)] border border-border-soft overflow-hidden"
        style={{ width: 540, background: 'var(--color-bg)', boxShadow: '0 24px 80px oklch(0 0 0 / 0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between" style={{ padding: '16px 22px', borderBottom: '1px solid var(--color-border-soft)' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600 }}>
            {phase === 'summary'
              ? <>Capture <em style={{ fontStyle: 'italic', color: 'var(--color-accent)', fontWeight: 500 }}>complete</em></>
              : <>Capture <em style={{ fontStyle: 'italic', color: 'var(--color-accent)', fontWeight: 500 }}>roster</em></>}
          </h2>
          <button onClick={onClose} style={{ color: 'var(--color-muted)' }}><IcoX /></button>
        </div>

        {/* Pick phase */}
        {phase === 'pick' && (
          <div style={{ padding: '18px 22px 22px' }}>
            <p style={{ margin: '0 0 18px', color: 'var(--color-text-dim)', fontSize: 13 }}>
              Open the in-game tribesman list, then capture. The Python sidecar will detect
              names, levels, clans, classes, titles, and all 366 trait icons.
            </p>

            <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 18 }}>
              <button
                className="btn-primary flex flex-col items-center justify-center gap-2"
                style={{ height: 76, borderRadius: 'var(--radius)' }}
                onClick={startProcessing}
              >
                <IcoCamera size={22} />
                <span>Capture screen</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--color-muted)', letterSpacing: '0.06em' }}>
                  SOULMASK.EXE · 2560×1440
                </span>
              </button>
              <button
                className="btn-outline flex flex-col items-center justify-center gap-2"
                style={{ height: 76, borderRadius: 'var(--radius)' }}
                onClick={startProcessing}
              >
                <IcoExport size={20} />
                <span>Import images</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--color-muted)', letterSpacing: '0.06em' }}>
                  PNG · JPG · WEBP
                </span>
              </button>
            </div>

            <SectionH>Source preview</SectionH>
            <div
              className="grid place-items-center rounded-[var(--radius)]"
              style={{ padding: '16px 0 14px', marginTop: 10, border: '1px dashed var(--color-border)', background: 'oklch(0.14 0.006 130)' }}
            >
              <div className="flex gap-2.5 mb-2.5">
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="grid place-items-center rounded"
                    style={{
                      width: 90, height: 60,
                      background: 'repeating-linear-gradient(45deg, oklch(0.20 0.012 130) 0 6px, oklch(0.16 0.008 130) 6px 12px)',
                      border: '1px solid var(--color-border)',
                      fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-muted)', letterSpacing: '0.06em',
                    }}
                  >
                    SHOT {i}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--color-muted)' }}>
                Drag images here · or paste from clipboard{' '}
                <kbd style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9.5,
                  background: 'var(--color-bg-elev)', border: '1px solid var(--color-border)',
                  borderRadius: 3, padding: '1px 5px', marginLeft: 4,
                }}>⌘ V</kbd>
              </div>
            </div>

            <div className="flex items-center justify-between" style={{ marginTop: 18 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)', letterSpacing: '0.08em' }}>
                ◆ DEDUP ON · MERGE WITH CURRENT ROSTER
              </span>
              <button className="btn-outline" onClick={onClose}>Cancel</button>
            </div>
          </div>
        )}

        {/* Processing phase */}
        {phase === 'processing' && (
          <div style={{ padding: '18px 22px 28px' }}>
            <div className="flex items-center justify-between mb-1">
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontStyle: 'italic', color: 'var(--color-accent)' }}>
                Reading the masks…
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-dim)' }}>
                {Math.round(progress)}%
              </span>
            </div>
            <ProgressBar value={progress} />

            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginTop: 18 }}>
              {([
                ['Names', 18], ['Clans', 36], ['Groups', 54], ['Traits', 72], ['Status', 88],
              ] as const).map(([label, threshold]) => {
                const done = progress > threshold
                return (
                  <div
                    key={label}
                    className="flex items-center justify-between"
                    style={{
                      padding: '10px 12px',
                      border: `1px solid ${done ? 'var(--color-accent-soft)' : 'var(--color-border-soft)'}`,
                      background: done ? 'var(--color-accent-glow)' : 'transparent',
                      borderRadius: 'var(--radius)',
                      fontSize: 11.5,
                      color: done ? 'var(--color-accent)' : 'var(--color-muted)',
                      fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase',
                      transition: 'all 0.3s',
                    }}
                  >
                    {label}
                    {done && <IcoCheck size={12} />}
                  </div>
                )
              })}
            </div>

            <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 24, color: 'var(--color-muted)', fontSize: 11.5 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Screenshots</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--color-text)' }}>{shots}</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tribesmen found</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--color-accent)' }}>
                  {Math.floor(progress / 100 * 14)}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Sidecar</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13, color: 'var(--color-text)' }}>OpenCV · Tesseract</div>
              </div>
            </div>
          </div>
        )}

        {/* Summary phase */}
        {phase === 'summary' && (
          <div style={{ padding: '18px 22px 22px' }}>
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: 'repeat(3, 1fr)', padding: '18px 0 22px', borderBottom: '1px solid var(--color-border-soft)', marginBottom: 18 }}
            >
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 40, fontWeight: 500 }}>14</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  ◆ Tribesmen found
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 40, fontWeight: 500, color: 'var(--color-accent)' }}>12</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  ◆ High confidence
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 40, fontWeight: 500, color: 'var(--color-gold)' }}>{REVIEW_ITEMS.length}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  ◆ Need review
                </div>
              </div>
            </div>
            <p style={{ margin: '0 0 18px', color: 'var(--color-text-dim)', fontSize: 13 }}>
              The codex parsed your roster. {REVIEW_ITEMS.length} fields scored below the 80% threshold —
              review them, or accept the highest-confidence guesses.
            </p>
            <div className="flex justify-end gap-2.5">
              <button className="btn-outline" onClick={() => onDone()}>Skip review</button>
              <button className="btn-primary" onClick={() => onDone('review')}>
                Review {REVIEW_ITEMS.length} items
                <IcoCheck size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SectionH({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--color-muted)', textTransform: 'uppercase' }}>
      {children}
    </div>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="rounded-full overflow-hidden" style={{ height: 4, background: 'var(--color-border-soft)' }}>
      <div
        className="h-full rounded-full"
        style={{
          width: value + '%',
          background: 'var(--color-accent)',
          boxShadow: '0 0 8px var(--color-accent-glow)',
          transition: 'width 0.15s ease-out',
        }}
      />
    </div>
  )
}
