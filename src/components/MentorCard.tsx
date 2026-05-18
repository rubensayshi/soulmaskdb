import type { RankedMentor } from '../lib/planner'

interface Props {
  mentor: RankedMentor
}

export function MentorCard({ mentor }: Props) {
  const { tribesman: tm, desiredTraits, totalNormal, score } = mentor
  const pct = Math.round(score * 100)
  const isHighOdds = pct >= 50

  return (
    <div
      className="rounded-[var(--radius)]"
      style={{
        padding: '10px 12px',
        background: isHighOdds ? 'oklch(0.80 0.06 140 / 0.04)' : 'oklch(0.19 0.008 130 / 0.4)',
        border: `1px solid ${isHighOdds ? 'oklch(0.80 0.06 140 / 0.12)' : 'var(--color-border-soft)'}`,
      }}
    >
      <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-serif)' }}>
          {tm.name}
        </span>
        <span style={{ fontSize: 20, fontWeight: 700, color: isHighOdds ? 'var(--color-accent)' : 'var(--color-text-dim)' }}>
          {pct}%
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', marginBottom: 8 }}>
        Lv.{tm.level} · {tm.clan}
      </div>

      <div className="flex flex-wrap gap-1">
        {desiredTraits.map(t => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 rounded-full"
            style={{
              padding: '1px 6px',
              fontSize: 11,
              background: 'oklch(0.80 0.06 140 / 0.12)',
              color: 'var(--color-accent)',
            }}
          >
            {t.name}
          </span>
        ))}
        {totalNormal - desiredTraits.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--color-faint)', padding: '1px 4px' }}>
            +{totalNormal - desiredTraits.length} other{totalNormal - desiredTraits.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div style={{ fontSize: 10, color: 'var(--color-faint)', marginTop: 6, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
        {totalNormal} traits · {desiredTraits.length} desired
      </div>
    </div>
  )
}
