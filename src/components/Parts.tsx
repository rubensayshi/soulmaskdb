import { CLANS, GROUPS, STATUS_LABEL } from '../lib/data'
import type { ClanName, StatusType } from '../lib/types'
import { GroupDots } from './Icons'

export function ClanTag({ clan }: { clan: ClanName }) {
  const c = CLANS[clan]
  if (!c) return null
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] border border-current uppercase"
      style={{ color: c.hue, fontFamily: 'var(--font-mono)', fontSize: '9.5px', letterSpacing: '0.1em' }}
    >
      <span className="w-[5px] h-[5px] rounded-full bg-current" />
      {c.label}
    </span>
  )
}

export function GroupTag({ group, muted = false }: { group: string; muted?: boolean }) {
  const g = GROUPS.find(x => x.id === group)
  if (!g) return null
  const isUnset = group === 'unassigned'
  return (
    <span
      className="inline-flex items-center gap-[5px] uppercase"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '9.5px',
        letterSpacing: '0.06em',
        color: muted ? 'var(--color-faint)' : 'var(--color-text-dim)',
        opacity: isUnset ? 0.55 : 1,
        fontStyle: isUnset ? 'italic' : 'normal',
      }}
    >
      <span style={{ color: 'var(--color-accent)', opacity: 0.75, display: 'inline-flex' }}>
        <GroupDots />
      </span>
      {g.name}
    </span>
  )
}

export function StatusPill({ status }: { status: StatusType }) {
  const label = STATUS_LABEL[status] || status

  const dotStyle: React.CSSProperties = {
    width: 8, height: 8, borderRadius: '50%', flexShrink: 0, position: 'relative',
  }

  const statusStyles: Record<StatusType, React.CSSProperties> = {
    idle: { background: 'oklch(0.65 0.05 130)', animation: 'pulse 2.6s infinite ease-in-out' },
    hosting: { background: 'var(--color-gold)', boxShadow: '0 0 6px var(--color-gold)', animation: 'hostingGlow 3s infinite linear' },
    mining: { background: 'oklch(0.7 0.08 60)', boxShadow: '0 0 6px oklch(0.7 0.08 60 / 0.6)' },
    'work-break': { background: 'oklch(0.55 0.04 130)' },
    resting: { background: 'oklch(0.5 0.02 220)', animation: 'pulse 3.5s infinite ease-in-out' },
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-border"
      style={{
        padding: '3px 8px 3px 6px',
        background: 'oklch(0.22 0.010 130)',
        fontSize: '10.5px',
        color: 'var(--color-text-dim)',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.04em',
      }}
    >
      <span style={{ ...dotStyle, ...statusStyles[status] }} />
      {label}
    </span>
  )
}

export function ProfGrid({ prof }: { prof: number[] }) {
  return (
    <span className="inline-grid grid-cols-4 gap-0.5" title="Proficiencies">
      {prof.map((v, i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-[1px]"
          style={{
            background: v >= 3
              ? 'var(--color-gold)'
              : v >= 1
                ? 'var(--color-accent)'
                : 'oklch(0.30 0.010 130)',
          }}
        />
      ))}
    </span>
  )
}
