import { useMemo } from 'react'
import { CLANS, GROUPS, MOCK_ROSTER, PROF_SKILLS, ENABLE_PROFICIENCIES } from '../lib/data'
import type { Filters, ClanName } from '../lib/types'

const CLAN_LIST: ClanName[] = ['Claw', 'Flint', 'Fang', 'Wolf', 'Horn', 'Exile', 'DLC']

interface Props {
  filters: Filters
  setFilters: (f: Filters) => void
}

export function FilterBar({ filters, setFilters }: Props) {
  const allTraitNames = useMemo(() => {
    const seen = new Map<string, string>()
    for (const tm of MOCK_ROSTER) {
      for (const t of tm.traits) {
        if (!seen.has(t.id)) seen.set(t.id, t.name)
      }
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [])

  function toggleGroup(id: string) {
    const cur = filters.groups
    const next = cur.includes(id) ? cur.filter(g => g !== id) : [...cur, id]
    setFilters({ ...filters, groups: next })
  }

  function toggleTrait(id: string) {
    const cur = filters.traits
    const next = cur.includes(id) ? cur.filter(t => t !== id) : [...cur, id]
    setFilters({ ...filters, traits: next })
  }

  const allGroupsActive = filters.groups.length === 0

  return (
    <div
      className="flex items-center gap-2 flex-wrap border-b border-border-soft"
      style={{ padding: '14px 22px', background: 'oklch(0.155 0.006 130)' }}
    >
      {/* Clan */}
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

      {/* Level */}
      <span className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)', letterSpacing: '0.1em', marginRight: 4 }}>
        Level
      </span>
      <Chip on={filters.minLevel === null} onClick={() => setFilters({ ...filters, minLevel: null })}>
        Any
      </Chip>
      {[30, 40, 50].map(lv => (
        <Chip key={lv} on={filters.minLevel === lv} onClick={() => setFilters({ ...filters, minLevel: lv })}>
          {lv}+
        </Chip>
      ))}
      <div
        className="inline-flex items-center gap-1 rounded-full border transition-all duration-100"
        style={{
          height: 26,
          padding: '0 8px',
          border: `1px solid ${filters.minLevel !== null && ![30, 40, 50].includes(filters.minLevel) ? 'var(--color-accent-soft)' : 'var(--color-border)'}`,
          background: filters.minLevel !== null && ![30, 40, 50].includes(filters.minLevel) ? 'var(--color-accent-glow)' : 'transparent',
        }}
      >
        <input
          type="number"
          min={1}
          max={99}
          placeholder="Min"
          className="bg-transparent border-0 outline-0 w-8 text-center"
          style={{
            fontSize: 11,
            color: 'var(--color-text-dim)',
            fontFamily: 'var(--font-mono)',
          }}
          value={filters.minLevel !== null && ![30, 40, 50].includes(filters.minLevel) ? filters.minLevel : ''}
          onChange={e => {
            const v = e.target.value ? parseInt(e.target.value, 10) : null
            setFilters({ ...filters, minLevel: v && v > 0 ? v : null })
          }}
        />
        <span style={{ fontSize: 10, color: 'var(--color-muted)' }}>+</span>
      </div>

      <span style={{ flexBasis: '100%', height: 0 }} />

      {/* Group */}
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

      <span style={{ flexBasis: '100%', height: 0 }} />

      {/* Traits */}
      <span className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)', letterSpacing: '0.1em', marginRight: 4 }}>
        Traits
      </span>
      <Chip on={filters.traits.length === 0} onClick={() => setFilters({ ...filters, traits: [] })}>
        Any
      </Chip>
      {allTraitNames.map(([id, name]) => {
        const on = filters.traits.includes(id)
        return (
          <Chip key={id} on={on} onClick={() => toggleTrait(id)}>
            {name}
          </Chip>
        )
      })}
      {filters.traits.length > 0 && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--color-muted)', letterSpacing: '0.06em', marginLeft: 4 }}>
          · {filters.traits.length} selected (AND)
        </span>
      )}

      {ENABLE_PROFICIENCIES && <>
      <span style={{ flexBasis: '100%', height: 0 }} />

      {/* Proficiency */}
      <span className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)', letterSpacing: '0.1em', marginRight: 4 }}>
        Prof.
      </span>
      <Chip on={filters.prof === null} onClick={() => setFilters({ ...filters, prof: null })}>
        Any
      </Chip>
      {PROF_SKILLS.map((skill, idx) => {
        const on = filters.prof !== null && filters.prof.skill === idx
        return (
          <Chip key={skill} on={on} onClick={() => setFilters({ ...filters, prof: on ? null : { skill: idx, min: filters.prof?.min ?? 90 } })}>
            {skill}
          </Chip>
        )
      })}
      {filters.prof !== null && (
        <>
          <span style={{ width: 8 }} />
          <span className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)', letterSpacing: '0.1em' }}>
            min
          </span>
          {[90, 120, 150].map(v => (
            <Chip key={v} on={filters.prof !== null && filters.prof.min === v}
              onClick={() => setFilters({ ...filters, prof: { skill: filters.prof!.skill, min: v } })}>
              {v}+
            </Chip>
          ))}
          <div
            className="inline-flex items-center gap-1 rounded-full border transition-all duration-100"
            style={{
              height: 26,
              padding: '0 8px',
              border: `1px solid ${filters.prof !== null && ![90, 120, 150].includes(filters.prof.min) ? 'var(--color-accent-soft)' : 'var(--color-border)'}`,
              background: filters.prof !== null && ![90, 120, 150].includes(filters.prof.min) ? 'var(--color-accent-glow)' : 'transparent',
            }}
          >
            <input
              type="number"
              min={1}
              max={200}
              placeholder="Min"
              className="bg-transparent border-0 outline-0 w-8 text-center"
              style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)' }}
              value={![90, 120, 150].includes(filters.prof.min) ? filters.prof.min : ''}
              onChange={e => {
                const v = e.target.value ? parseInt(e.target.value, 10) : 90
                setFilters({ ...filters, prof: { skill: filters.prof!.skill, min: Math.max(1, v) } })
              }}
            />
            <span style={{ fontSize: 10, color: 'var(--color-muted)' }}>+</span>
          </div>
        </>
      )}
      </>}
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
