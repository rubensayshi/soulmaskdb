import { useState, useMemo } from 'react'
import { MOCK_ROSTER, REVIEW_ITEMS } from './lib/data'
import type { Filters, SortState, LayoutMode } from './lib/types'
import { RosterTable, sortRows, filterRows } from './pages/Roster'
import { FilterBar } from './components/FilterBar'
import { IcoCompass, IcoUsers, IcoCamera, IcoFlag, IcoCog, IcoSearch, IcoExport, IcoTable, IcoCards, IcoSplit } from './components/Icons'
import './styles.css'

function App() {
  const [layout, setLayout] = useState<LayoutMode>('table')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Filters>({ clan: 'all', status: 'all', groups: [] })
  const [sort, setSort] = useState<SortState>({ key: 'name', dir: 'asc' })
  const [screen, setScreen] = useState<'roster' | 'empty'>('roster')

  const rows = useMemo(
    () => sortRows(filterRows(MOCK_ROSTER, filters, query), sort),
    [filters, query, sort],
  )

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      {/* Title bar */}
      <div
        className="flex items-center"
        style={{
          height: 36,
          background: 'linear-gradient(180deg, oklch(0.20 0.008 130), oklch(0.17 0.007 130))',
          borderBottom: '1px solid var(--color-border-soft)',
          // @ts-expect-error Tauri custom title bar drag region
          WebkitAppRegion: 'drag',
        }}
      >
        <div className="flex items-center gap-2.5 px-3">
          <span style={{ color: 'var(--color-accent)' }}><IcoCompass size={16} /></span>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 13, letterSpacing: '0.02em' }}>
            Soulmask Codex
            <span style={{ color: 'var(--color-muted)', marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em' }}>
              v0.4.0 · TAURI
            </span>
          </span>
        </div>
        <div className="flex-1 flex justify-center">
          <span
            className="inline-flex items-center gap-2 rounded-full"
            style={{
              padding: '4px 10px',
              border: '1px solid var(--color-border)',
              background: 'oklch(0.18 0.008 130 / 0.6)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--color-muted)',
              letterSpacing: '0.06em',
            }}
          >
            <span
              className="rounded-full"
              style={{
                width: 6, height: 6,
                background: 'var(--color-accent)',
                boxShadow: '0 0 8px var(--color-accent-glow)',
                animation: 'pulse 2.4s infinite ease-in-out',
              }}
            />
            CAPTURE READY ·{' '}
            <kbd style={kbdStyle}>Alt</kbd>+<kbd style={kbdStyle}>Shift</kbd>+<kbd style={kbdStyle}>S</kbd>
          </span>
        </div>
      </div>

      {/* App body */}
      <div className="flex-1 flex min-h-0 relative grain" style={{ background: 'var(--color-bg)' }}>
        {/* Left rail */}
        <div
          className="flex flex-col items-center gap-1"
          style={{
            width: 56,
            background: 'oklch(0.14 0.006 130)',
            borderRight: '1px solid var(--color-border-soft)',
            padding: '12px 0',
          }}
        >
          <div className="grid place-items-center mb-2.5" style={{ width: 32, height: 32, color: 'var(--color-accent)' }}>
            <IcoCompass size={22} />
          </div>
          <RailBtn active={screen === 'roster'} onClick={() => setScreen('roster')} title="Roster">
            <IcoUsers />
          </RailBtn>
          <RailBtn onClick={() => {}} title="Capture (Alt+Shift+S)">
            <IcoCamera />
          </RailBtn>
          <RailBtn onClick={() => {}} title="Review queue">
            <IcoFlag />
            <span
              className="absolute grid place-items-center rounded-full"
              style={{
                top: 4, right: 4, minWidth: 14, height: 14,
                background: 'var(--color-gold)', color: '#1a1a14',
                fontSize: 9, fontWeight: 700, padding: '0 3px',
              }}
            >
              {REVIEW_ITEMS.length}
            </span>
          </RailBtn>
          <div className="flex-1" />
          <RailBtn onClick={() => {}} title="Settings">
            <IcoCog />
          </RailBtn>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {/* Top bar */}
          <div
            className="flex items-center gap-4 shrink-0"
            style={{
              height: 56,
              padding: '0 22px',
              borderBottom: '1px solid var(--color-border-soft)',
              background: 'oklch(0.165 0.006 130 / 0.7)',
            }}
          >
            <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 22, margin: 0, letterSpacing: '0.01em' }}>
              Tribesman <em style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--color-accent)', marginLeft: 2 }}>Roster</em>
            </h1>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.08em',
                color: 'var(--color-muted)',
                textTransform: 'uppercase',
                borderLeft: '1px solid var(--color-border)',
                paddingLeft: 14,
              }}
            >
              <b style={{ color: 'var(--color-text)', fontWeight: 500 }}>{rows.length}</b> / {MOCK_ROSTER.length} tribesmen
            </span>
            <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--color-muted)', fontSize: 13 }}>
              · captured 17 minutes ago
            </span>
            <span className="flex-1" />

            {/* Layout toggle */}
            <div
              className="inline-flex gap-px rounded-[var(--radius)]"
              style={{
                height: 30,
                border: '1px solid var(--color-border)',
                background: 'oklch(0.18 0.008 130)',
                padding: 2,
              }}
            >
              <SegBtn on={layout === 'table'} onClick={() => setLayout('table')}><IcoTable />Table</SegBtn>
              <SegBtn on={layout === 'cards'} onClick={() => setLayout('cards')}><IcoCards />Cards</SegBtn>
              <SegBtn on={layout === 'split'} onClick={() => setLayout('split')}><IcoSplit />Split</SegBtn>
            </div>

            {/* Search */}
            <div
              className="flex items-center rounded-[var(--radius)] transition-colors"
              style={{
                width: 280, height: 30,
                background: 'oklch(0.18 0.008 130)',
                border: '1px solid var(--color-border-soft)',
                padding: '0 10px',
              }}
            >
              <IcoSearch />
              <input
                className="flex-1 bg-transparent border-0 outline-0 px-2"
                style={{ color: 'var(--color-text)', fontSize: 12.5, fontStyle: 'italic' }}
                placeholder="Search name, clan, title..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <kbd style={{ ...kbdStyle, fontSize: 9, padding: '1px 4px' }}>⌘K</kbd>
            </div>

            <button className="btn-outline">
              <IcoExport />Export
            </button>
            <button className="btn-primary">
              <IcoCamera size={12} />Capture
            </button>
          </div>

          {/* Filter bar */}
          {layout !== 'split' && (
            <FilterBar filters={filters} setFilters={setFilters} />
          )}

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-auto content-scroll">
            {layout === 'table' && (
              <RosterTable rows={rows} sort={sort} setSort={setSort} showProf />
            )}
            {layout === 'cards' && (
              <div className="p-5 text-center" style={{ color: 'var(--color-muted)' }}>
                Cards layout — coming soon
              </div>
            )}
            {layout === 'split' && (
              <div className="p-5 text-center" style={{ color: 'var(--color-muted)' }}>
                Split layout — coming soon
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const kbdStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  background: 'oklch(0.24 0.010 130)',
  border: '1px solid var(--color-border)',
  borderRadius: 3,
  padding: '0px 5px',
  fontSize: 9.5,
  color: 'var(--color-text-dim)',
}

function RailBtn({ active, onClick, title, children }: {
  active?: boolean; onClick: () => void; title: string; children: React.ReactNode
}) {
  return (
    <button
      className="relative grid place-items-center rounded-lg transition-colors"
      style={{
        width: 40, height: 40,
        color: active ? 'var(--color-accent)' : 'var(--color-muted)',
      }}
      onClick={onClick}
      title={title}
    >
      {active && (
        <span
          className="absolute rounded-sm"
          style={{
            left: -8, top: 8, bottom: 8, width: 2,
            background: 'var(--color-accent)',
            boxShadow: '0 0 8px var(--color-accent-glow)',
          }}
        />
      )}
      {children}
    </button>
  )
}

function SegBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className="inline-flex items-center gap-1.5 rounded transition-all duration-100"
      style={{
        padding: '0 12px',
        fontSize: 11.5,
        letterSpacing: '0.02em',
        color: on ? 'var(--color-accent)' : 'var(--color-muted)',
        background: on ? 'var(--color-accent-glow)' : undefined,
        boxShadow: on ? 'inset 0 0 0 1px var(--color-accent-soft)' : undefined,
      }}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default App
