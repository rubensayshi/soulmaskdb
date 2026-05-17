import { CLANS, GROUPS, STATUS_LABEL } from '../lib/data'
import type { Filters, ClanName, StatusType } from '../lib/types'

const CLAN_LIST: ClanName[] = ['Claw', 'Flint', 'Fang', 'Wolf', 'Horn', 'Exile', 'DLC']
const STATUS_LIST: StatusType[] = ['idle', 'hosting', 'mining', 'work-break', 'resting']

interface Props {
  filters: Filters
  setFilters: (f: Filters) => void
}

export function FilterBar({ filters, setFilters }: Props) {
  function toggleGroup(id: string) {
    const cur = filters.groups
    const next = cur.includes(id) ? cur.filter(g => g !== id) : [...cur, id]
    setFilters({ ...filters, groups: next })
  }

  const allGroupsActive = filters.groups.length === 0

  return (
    <div
      className="flex items-center gap-2 flex-wrap border-b border-border-soft"
      style={{ padding: '14px 22px', background: 'oklch(0.155 0.006 130)' }}
    >
      <span className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)', letterSpacing: '0.1em', marginRight: 4 }}>
        Clan
      </span>
      <Chip on={filters.clan === 'all'} onClick={() => setFilters({ ...filters, clan: 'all' })}>
        All
      </Chip>
      {CLAN_LIST.map(c => {
        const hue = CLANS[c].hue
        const on = filters.clan === c
        return (
          <Chip key={c} on={on} onClick={() => setFilters({ ...filters, clan: c })}
            style={on ? { color: hue, borderColor: hue } : {}}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: hue }} />
            {c}
          </Chip>
        )
      })}

      <span style={{ width: 14 }} />

      <span className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)', letterSpacing: '0.1em', marginRight: 4 }}>
        Status
      </span>
      <Chip on={filters.status === 'all'} onClick={() => setFilters({ ...filters, status: 'all' })}>
        Any
      </Chip>
      {STATUS_LIST.map(s => (
        <Chip key={s} on={filters.status === s} onClick={() => setFilters({ ...filters, status: s })}>
          {STATUS_LABEL[s]}
        </Chip>
      ))}

      <span style={{ flexBasis: '100%', height: 0 }} />

      <span className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)', letterSpacing: '0.1em', marginRight: 4 }}>
        Group
      </span>
      <Chip on={allGroupsActive} onClick={() => setFilters({ ...filters, groups: [] })}>
        All
      </Chip>
      {GROUPS.map(g => {
        const on = filters.groups.includes(g.id)
        return (
          <Chip key={g.id} on={on} onClick={() => toggleGroup(g.id)} title={g.hint}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: on ? 'var(--color-accent)' : 'var(--color-muted)' }}>
              <svg width={8} height={8} viewBox="0 0 10 10">
                <circle cx="2" cy="2" r="1.2" fill="currentColor" />
                <circle cx="5" cy="2" r="1.2" fill="currentColor" />
                <circle cx="8" cy="2" r="1.2" fill="currentColor" />
                <circle cx="2" cy="5" r="1.2" fill="currentColor" />
                <circle cx="5" cy="5" r="1.2" fill="currentColor" />
                <circle cx="8" cy="5" r="1.2" fill="currentColor" />
              </svg>
            </span>
            {g.name}
          </Chip>
        )
      })}
      {!allGroupsActive && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--color-muted)', letterSpacing: '0.06em', marginLeft: 4 }}>
          · {filters.groups.length} active
        </span>
      )}
    </div>
  )
}

function Chip({ on, onClick, children, style, title }: {
  on: boolean
  onClick: () => void
  children: React.ReactNode
  style?: React.CSSProperties
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="inline-flex items-center gap-1.5 rounded-full border transition-all duration-100"
      style={{
        height: 26,
        padding: '0 10px',
        fontSize: '11.5px',
        border: `1px solid ${on ? 'var(--color-accent-soft)' : 'var(--color-border)'}`,
        background: on ? 'var(--color-accent-glow)' : 'transparent',
        color: on ? 'var(--color-accent)' : 'var(--color-text-dim)',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
