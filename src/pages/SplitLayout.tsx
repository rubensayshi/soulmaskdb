import { useState } from 'react'
import type { Tribesman } from '../lib/types'
import { CLANS } from '../lib/data'
import { ClanTag, GroupTag, StatusPill } from '../components/Parts'
import { ExpandedRow } from './Roster'

interface Props {
  rows: Tribesman[]
  showProf: boolean
}

export function SplitLayout({ rows, showProf }: Props) {
  const [selectedId, setSelectedId] = useState<string>(rows[0]?.id ?? '')
  const sel = rows.find(r => r.id === selectedId) || rows[0]

  return (
    <div className="grid h-full min-h-0" style={{ gridTemplateColumns: '320px 1fr' }}>
      {/* Left list */}
      <div className="overflow-y-auto border-r border-border-soft" style={{ background: 'oklch(0.155 0.006 130)' }}>
        {rows.map(tm => {
          const isSel = sel && sel.id === tm.id
          return (
            <div
              key={tm.id}
              className="flex items-center gap-3 cursor-default border-b border-border-soft hover:bg-bg-elev"
              style={{
                padding: isSel ? '12px 16px 12px 14px' : '12px 16px',
                background: isSel ? 'var(--color-accent-glow)' : undefined,
                borderLeft: isSel ? '2px solid var(--color-accent)' : undefined,
              }}
              onClick={() => setSelectedId(tm.id)}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: CLANS[tm.clan].hue }}
              />
              <div className="flex-1 min-w-0">
                <div className="truncate" style={{ fontFamily: 'var(--font-serif)', fontSize: 15 }}>
                  {tm.name}
                </div>
                <div className="flex items-center gap-1.5" style={{ fontSize: 10.5, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  <span>LV.{tm.level}</span>
                  <span style={{ color: 'var(--color-faint)' }}>·</span>
                  <GroupTag group={tm.group} />
                </div>
              </div>
              <StatusPill status={tm.status} />
            </div>
          )
        })}
      </div>

      {/* Right detail */}
      <div className="overflow-y-auto content-scroll" style={{ padding: '28px 32px' }}>
        {sel && (
          <div>
            {/* Hero */}
            <div className="flex items-baseline gap-3 mb-1">
              <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 500 }}>{sel.name}</h2>
              <span className="cell-level" style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--color-accent)', fontWeight: 500 }}>
                {sel.level}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap mb-4">
              <ClanTag clan={sel.clan} />
              <GroupTag group={sel.group} />
              <span style={{ color: 'var(--color-text-dim)' }}>{sel.klass}</span>
              <span className="w-[3px] h-[3px] rounded-full" style={{ background: 'var(--color-border-strong)' }} />
              <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--color-gold)', fontSize: 17 }}>{sel.title}</span>
            </div>

            {/* Info strip */}
            <div
              className="flex items-center justify-between flex-wrap gap-3 rounded-[var(--radius)] mb-5"
              style={{ padding: 14, background: 'oklch(0.18 0.008 130 / 0.5)', border: '1px solid var(--color-border-soft)' }}
            >
              <div className="flex items-center gap-3.5" style={{ fontSize: 11.5 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.1em', color: 'var(--color-muted)', textTransform: 'uppercase' }}>◆ Location</span>
                <span>{sel.location}</span>
              </div>
              <StatusPill status={sel.status} />
            </div>

            {/* Detail panel */}
            <ExpandedRow tm={sel} showProf={showProf} />
          </div>
        )}
      </div>
    </div>
  )
}
