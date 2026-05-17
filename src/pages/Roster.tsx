import { useState } from 'react'
import type { Tribesman, TraitMatch, SortState, BadgeShape } from '../lib/types'
import { ClanTag, GroupTag } from '../components/Parts'
import { PROF_SKILLS } from '../lib/data'
import { TraitBadge, TraitBadgeLg, SHAPE_COLORS } from '../components/TraitBadge'
import { IcoChevRight } from '../components/Icons'

interface Props {
  rows: Tribesman[]
  sort: SortState
  setSort: (s: SortState) => void
  showProf: boolean
}

export function RosterTable({ rows, sort, setSort, showProf }: Props) {
  const [expanded, setExpanded] = useState<string | null>(rows[0]?.id ?? null)

  return (
    <div style={{ padding: '0 22px 22px' }}>
      <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: '12.5px' }}>
        <thead>
          <tr>
            <Th width={24} />
            <SortTh k="name" label="Name" sort={sort} setSort={setSort} />
            <SortTh k="level" label="Lv." sort={sort} setSort={setSort} width={72} />
            <SortTh k="klass" label="Class" sort={sort} setSort={setSort} width={160} />
            <SortTh k="clan" label="Clan" sort={sort} setSort={setSort} width={100} />
            <SortTh k="title" label="Title" sort={sort} setSort={setSort} width={170} />
            <Th width="34%">Traits</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(tm => {
            const open = expanded === tm.id
            return (
              <Row key={tm.id} tm={tm} open={open} showProf={showProf}
                onClick={() => setExpanded(open ? null : tm.id)} />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children, width }: { children?: React.ReactNode; width?: number | string }) {
  return (
    <th
      className="text-left select-none whitespace-nowrap sticky top-0"
      style={{
        background: 'var(--color-bg)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--color-muted)',
        padding: '14px 12px 10px',
        borderBottom: '1px solid var(--color-border)',
        width,
      }}
    >
      {children}
    </th>
  )
}

function SortTh({ k, label, sort, setSort, width }: {
  k: string; label: string; sort: SortState; setSort: (s: SortState) => void; width?: number
}) {
  const active = sort.key === k
  const onClick = () => setSort({ key: k, dir: active && sort.dir === 'asc' ? 'desc' : 'asc' })
  return (
    <th
      className="text-left cursor-default select-none whitespace-nowrap sticky top-0 hover:!text-[var(--color-text)]"
      style={{
        background: 'var(--color-bg)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--color-muted)',
        padding: '14px 12px 10px',
        borderBottom: '1px solid var(--color-border)',
        width,
      }}
      onClick={onClick}
    >
      {label}
      <span style={{ marginLeft: 4, fontSize: 9, color: 'var(--color-accent)', opacity: active ? 1 : 0 }}>
        {active ? (sort.dir === 'asc' ? '▲' : '▼') : '▲'}
      </span>
    </th>
  )
}

function Row({ tm, open, showProf, onClick }: { tm: Tribesman; open: boolean; showProf: boolean; onClick: () => void }) {
  const rowBg = open
    ? 'oklch(0.22 0.012 140 / 0.45)'
    : undefined
  const hoverBg = 'oklch(0.20 0.008 130 / 0.6)'

  return (
    <>
      <tr
        className="cursor-default group"
        style={{ background: rowBg, transition: 'background 0.1s' }}
        onClick={onClick}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.background = hoverBg }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = rowBg || '' }}
      >
        <td style={{ ...tdStyle, borderBottom: open ? 'none' : undefined }}>
          <span
            className="inline-flex transition-transform duration-150"
            style={{ color: open ? 'var(--color-accent)' : 'var(--color-muted)', transform: open ? 'rotate(90deg)' : undefined }}
          >
            <IcoChevRight />
          </span>
        </td>
        <td style={{ ...tdStyle, borderBottom: open ? 'none' : undefined }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 500, letterSpacing: '0.005em' }}>
            {tm.name}
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap" style={{ marginTop: 1 }}>
            <GroupTag group={tm.group} />
            <span style={{ fontSize: 10.5, color: 'var(--color-muted)' }}>· {tm.location}</span>
          </div>
        </td>
        <td style={{ ...tdStyle, borderBottom: open ? 'none' : undefined }}>
          <span className="cell-level" style={{ fontFamily: 'var(--font-serif)', fontSize: 17, color: 'var(--color-accent)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
            {tm.level}
          </span>
        </td>
        <td style={{ ...tdStyle, color: 'var(--color-text-dim)', fontSize: '12.5px', borderBottom: open ? 'none' : undefined }}>
          {stripClassPrefix(tm.klass)}
        </td>
        <td style={{ ...tdStyle, borderBottom: open ? 'none' : undefined }}>
          <ClanTag clan={tm.clan} />
        </td>
        <td style={{ ...tdStyle, borderBottom: open ? 'none' : undefined }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: tm.title === '—' ? 'var(--color-faint)' : 'var(--color-gold)', fontSize: 14 }}>
            {tm.title}
          </span>
        </td>
        <td style={{ ...tdStyle, borderBottom: open ? 'none' : undefined }}>
          <div className="flex items-center gap-1">
            {tm.traits.map(t => (
              <TraitBadge key={t.id} trait={t} />
            ))}
          </div>
        </td>
      </tr>
      {open && (
        <tr style={{ background: 'oklch(0.18 0.010 140 / 0.4)' }}>
          <td colSpan={7} style={{ padding: 0, borderBottom: '1px solid var(--color-border)', height: 'auto' }}>
            <ExpandedRow tm={tm} showProf={showProf} />
          </td>
        </tr>
      )}
    </>
  )
}

const tdStyle: React.CSSProperties = {
  padding: '0 12px',
  borderBottom: '1px solid var(--color-border-soft)',
  verticalAlign: 'middle',
  height: 48,
}

export function ExpandedRow({ tm, showProf }: { tm: Tribesman; showProf: boolean }) {
  const byShape: Record<BadgeShape, typeof tm.traits> = {
    hexagon: tm.traits.filter(t => t.shape === 'hexagon'),
    shield: tm.traits.filter(t => t.shape === 'shield'),
    diamond: tm.traits.filter(t => t.shape === 'diamond'),
  }

  return (
    <div className="grid grid-cols-2" style={{ padding: '18px 22px 22px', borderTop: '1px solid var(--color-accent-soft)' }}>
      <div style={{ padding: '0 16px' }}>
        <h3 style={{ margin: '0 0 14px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--color-accent)', textTransform: 'uppercase', fontWeight: 500 }}>
          ◆ Details
        </h3>
        <dl className="grid gap-x-4 gap-y-1.5" style={{ gridTemplateColumns: 'max-content 1fr', fontSize: 12, marginBottom: 16 }}>
          <Dt>Class</Dt><Dd>{stripClassPrefix(tm.klass)}</Dd>
          <Dt>Title</Dt><Dd><em style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--color-gold)' }}>{tm.title}</em></Dd>
          <Dt>Group</Dt><Dd><GroupTag group={tm.group} /></Dd>
          <Dt>Location</Dt><Dd>{tm.location}</Dd>
          <Dt>Clan</Dt><Dd><ClanTag clan={tm.clan} /></Dd>
        </dl>

        {showProf && (
          <>
            <h3 style={{ margin: '0 0 14px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--color-accent)', textTransform: 'uppercase', fontWeight: 500 }}>
              ◆ Proficiencies
            </h3>
            <div className="grid grid-cols-4 gap-x-3.5 gap-y-1.5" style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
              {PROF_SKILLS.map((s, i) => (
                <div key={s} className="flex items-center justify-between gap-1.5">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.06em', color: 'var(--color-muted)', textTransform: 'uppercase' }}>{s}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: (tm.prof[i] || 0) >= 120 ? 'oklch(0.65 0.2 25)' : (tm.prof[i] || 0) >= 90 ? 'oklch(0.75 0.15 70)' : 'var(--color-text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                    {tm.prof[i] || 0}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ padding: '0 16px', borderLeft: '1px solid var(--color-border-soft)' }}>
        <h3 style={{ margin: '0 0 14px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--color-accent)', textTransform: 'uppercase', fontWeight: 500 }}>
          ◆ Traits · {tm.traits.length}
        </h3>
        {byShape.hexagon.map(t => <TraitDetailItem key={t.id} trait={t} />)}
        {byShape.shield.map(t => <TraitDetailItem key={t.id} trait={t} />)}
        {byShape.diamond.map(t => <TraitDetailItem key={t.id} trait={t} />)}
      </div>
    </div>
  )
}

function Dt({ children }: { children: React.ReactNode }) {
  return (
    <dt style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--color-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', alignSelf: 'center' }}>
      {children}
    </dt>
  )
}

function Dd({ children }: { children: React.ReactNode }) {
  return <dd style={{ margin: 0, color: 'var(--color-text)', alignSelf: 'center' }}>{children}</dd>
}

function TraitDetailItem({ trait }: { trait: TraitMatch }) {
  const c = SHAPE_COLORS[trait.shape]
  const sourceLabel = trait.shape === 'hexagon' ? 'Learned · Talent'
    : trait.shape === 'diamond' ? 'Preference'
    : 'Innate · Tribe-born'
  return (
    <div className="flex gap-3 items-start" style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border-soft)' }}>
      <TraitBadgeLg trait={trait} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--color-text)' }}>
          {trait.name}
          <span style={{ color: 'var(--color-gold)', fontSize: 11 }}>
            {'★'.repeat(trait.star)}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: c.stroke, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>
          {sourceLabel}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--color-text-dim)', marginTop: 4 }}>
          {trait.eff}
        </div>
      </div>
    </div>
  )
}

function stripClassPrefix(klass: string): string {
  return klass.replace(/^(Skilled|Novice|Master)\s+/, '')
}

export function sortRows(rows: Tribesman[], sort: SortState): Tribesman[] {
  const { key, dir } = sort
  const mult = dir === 'asc' ? 1 : -1
  return rows.slice().sort((a, b) => {
    const va = (a as unknown as Record<string, unknown>)[key]
    const vb = (b as unknown as Record<string, unknown>)[key]
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mult
    return String(va ?? '').localeCompare(String(vb ?? '')) * mult
  })
}

export function filterRows(rows: Tribesman[], filters: { clan: string; groups: string[]; traits: string[]; minLevel: number | null; prof: { skill: number; min: number } | null }, query: string): Tribesman[] {
  return rows.filter(r => {
    if (filters.clan !== 'all' && r.clan !== filters.clan) return false
    if (filters.groups.length > 0 && !filters.groups.includes(r.group)) return false
    if (filters.minLevel !== null && r.level < filters.minLevel) return false
    if (filters.traits.length > 0) {
      const traitIds = new Set(r.traits.map(t => t.id))
      if (!filters.traits.every(id => traitIds.has(id))) return false
    }
    if (filters.prof !== null && (r.prof[filters.prof.skill] ?? 0) < filters.prof.min) return false
    if (query) {
      const q = query.toLowerCase()
      const hay = (r.name + ' ' + r.title + ' ' + r.klass + ' ' + r.clan + ' ' + (r.group || '')).toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}
