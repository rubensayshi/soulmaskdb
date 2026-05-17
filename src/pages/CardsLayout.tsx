import type { Tribesman } from '../lib/types'
import { CLANS } from '../lib/data'
import { ClanTag, GroupTag } from '../components/Parts'
import { TraitBadge } from '../components/TraitBadge'

interface Props {
  rows: Tribesman[]
}

export function CardsLayout({ rows }: Props) {
  return (
    <div
      className="grid gap-3.5"
      style={{ padding: '20px 22px', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}
    >
      {rows.map(tm => {
        const hue = CLANS[tm.clan].hue
        return (
          <div
            key={tm.id}
            className="relative overflow-hidden rounded-[var(--radius)] border border-border-soft cursor-default transition-colors hover:border-accent-soft"
            style={{ background: 'var(--color-bg-elev)', padding: '14px 16px' }}
          >
            {/* Clan accent stripe */}
            <div
              className="absolute left-0 top-0 bottom-0"
              style={{ width: 3, background: hue, opacity: 0.7 }}
            />

            {/* Header: name + level */}
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 500 }}>{tm.name}</span>
              <span className="cell-level" style={{ fontFamily: 'var(--font-serif)', fontSize: 17, color: 'var(--color-accent)', fontWeight: 500 }}>
                {tm.level}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-2 flex-wrap" style={{ margin: '6px 0 12px', fontSize: 11.5, color: 'var(--color-muted)' }}>
              <ClanTag clan={tm.clan} />
              <span style={{ color: 'var(--color-text-dim)', fontWeight: 400 }}>{tm.klass.replace(/^(Skilled|Novice|Master)\s+/, '')}</span>
              <span className="w-[3px] h-[3px] rounded-full" style={{ background: 'var(--color-border-strong)' }} />
              <GroupTag group={tm.group} />
            </div>

            {/* Title + location */}
            <div className="flex items-center gap-2 mb-3" style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--color-gold)', fontSize: 14 }}>
              <span>{tm.title === '—' ? <span style={{ color: 'var(--color-faint)' }}>—</span> : tm.title}</span>
              <span className="w-[3px] h-[3px] rounded-full" style={{ background: 'var(--color-border-strong)' }} />
              <span style={{ fontFamily: 'var(--font-sans)', fontStyle: 'normal', color: 'var(--color-muted)', fontSize: 11 }}>
                {tm.location}
              </span>
            </div>

            {/* Traits */}
            <div className="flex flex-wrap gap-1 mb-3">
              {tm.traits.slice(0, 3).map(t => (
                <TraitBadge key={t.id} trait={t} />
              ))}
              {tm.traits.length > 3 && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)', marginLeft: 4, alignSelf: 'center' }}>
                  +{tm.traits.length - 3}
                </span>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--color-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {tm.traits.length} traits
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
