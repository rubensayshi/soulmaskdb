import { useState, useMemo, useEffect, useRef } from 'react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { MOCK_ROSTER, REVIEW_ITEMS, ENABLE_PROFICIENCIES } from './lib/data'
import { useRosterStore, type CaptureStatus, type LogEntry } from './lib/store'
import type { Filters, SortState, LayoutMode, ProcessResult } from './lib/types'
import { RosterTable, sortRows, filterRows } from './pages/Roster'
import { CardsLayout } from './pages/CardsLayout'
import { SplitLayout } from './pages/SplitLayout'
import { EmptyState } from './pages/EmptyState'
import { FilterBar } from './components/FilterBar'
import { CaptureModal } from './components/CaptureModal'
import { ReviewScreen } from './components/ReviewScreen'
import { SettingsModal } from './components/SettingsModal'
import { IcoCompass, IcoUsers, IcoCamera, IcoFlag, IcoCog, IcoSearch, IcoExport, IcoTable, IcoCards, IcoSplit, IcoTerminal, IcoTrash } from './components/Icons'
import './styles.css'

function App() {
  const [layout, setLayout] = useState<LayoutMode>('table')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Filters>({ clan: 'all', groups: [], traits: [], minLevel: null, prof: null })
  const [sort, setSort] = useState<SortState>({ key: 'name', dir: 'asc' })
  const [screen, setScreen] = useState<'roster' | 'empty' | 'review'>('roster')
  const [showCapture, setShowCapture] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showLog, setShowLog] = useState(false)

  const store = useRosterStore()
  const rosterData = store.tribesmen.length > 0 ? store.tribesmen : (import.meta.env.DEV ? MOCK_ROSTER : [])

  // Load persisted roster on startup
  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return
    invoke<{ last_updated: string; tribesmen: unknown[] } | null>('load_roster')
      .then(raw => { if (raw) store.loadRoster(raw as Parameters<typeof store.loadRoster>[0]) })
      .catch(console.error)
  }, [])

  // Auto-save roster whenever tribesmen change
  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return
    if (store.tribesmen.length === 0) return
    invoke('save_roster', {
      roster: { last_updated: store.lastUpdated ?? new Date().toISOString(), tribesmen: store.tribesmen }
    }).catch(console.error)
  }, [store.tribesmen])

  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return
    const unsubs: (() => void)[] = []
    listen<string>('capture:status', (e) => {
      store.setCaptureStatus(e.payload as CaptureStatus)
    }).then(u => unsubs.push(u))
    listen<ProcessResult>('capture:result', (e) => {
      store.addCaptureResult(e.payload)
    }).then(u => unsubs.push(u))
    listen<string>('capture:error', (e) => {
      store.setCaptureError(e.payload)
    }).then(u => unsubs.push(u))
    listen<number>('capture:queued', (e) => {
      store.setQueueCount(e.payload)
    }).then(u => unsubs.push(u))
    listen<string>('capture:queued_path', (e) => {
      store.logQueuedPath(e.payload)
    }).then(u => unsubs.push(u))
    listen<string>('capture:progress', (e) => {
      store.setProgress(e.payload)
    }).then(u => unsubs.push(u))
    return () => unsubs.forEach(u => u())
  }, [])

  const rows = useMemo(
    () => sortRows(filterRows(rosterData, filters, query), sort),
    [rosterData, filters, query, sort],
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
        <div className="flex-1 flex justify-center items-center gap-3">
          <CaptureIndicator status={store.captureStatus} error={store.captureError} lastCount={store.lastCaptureCount} progress={store.processProgress} />
          {store.queueCount > 0 && (
            <QueueBadge count={store.queueCount} onProcess={() => invoke('process_queue')} onClear={() => invoke('clear_queue')} />
          )}
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
          <RailBtn onClick={() => setShowCapture(true)} title="Capture (Alt+Shift+S)">
            <IcoCamera />
          </RailBtn>
          <RailBtn active={showLog} onClick={() => setShowLog(v => !v)} title="Capture log">
            <IcoTerminal />
            {store.captureLog.length > 0 && (
              <span
                className="absolute rounded-full"
                style={{
                  top: 6, right: 6, width: 7, height: 7,
                  background: store.captureLog[store.captureLog.length - 1].level === 'error'
                    ? 'oklch(0.65 0.2 25)' : 'var(--color-accent)',
                }}
              />
            )}
          </RailBtn>
          <RailBtn active={screen === 'review'} onClick={() => setScreen('review')} title="Review queue">
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
          <RailBtn onClick={() => setShowSettings(true)} title="Settings">
            <IcoCog />
          </RailBtn>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {/* Top bar — only for roster */}
          {screen === 'roster' && <div
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
              <b style={{ color: 'var(--color-text)', fontWeight: 500 }}>{rows.length}</b> / {rosterData.length} tribesmen
            </span>
            {store.lastUpdated && (
              <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--color-muted)', fontSize: 13 }}>
                · captured {timeAgo(store.lastUpdated)}
              </span>
            )}
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
            <button className="btn-primary" onClick={() => setShowCapture(true)}>
              <IcoCamera size={12} />Capture
            </button>
          </div>}

          {/* Filter bar */}
          {screen === 'roster' && layout !== 'split' && (
            <FilterBar filters={filters} setFilters={setFilters} />
          )}

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-auto content-scroll">
            {screen === 'empty' && (
              <EmptyState onCapture={() => setShowCapture(true)} />
            )}
            {screen === 'review' && (
              <ReviewScreen onDone={() => setScreen('roster')} />
            )}
            {screen === 'roster' && layout === 'table' && (
              <RosterTable rows={rows} sort={sort} setSort={setSort} showProf={ENABLE_PROFICIENCIES} />
            )}
            {screen === 'roster' && layout === 'cards' && (
              <CardsLayout rows={rows} />
            )}
            {screen === 'roster' && layout === 'split' && (
              <SplitLayout rows={rows} showProf={ENABLE_PROFICIENCIES} />
            )}
          </div>

          {/* Capture log drawer */}
          {showLog && <CaptureLogPanel log={store.captureLog} onClear={store.clearLog} />}
        </div>
      </div>

      {showCapture && (
        <CaptureModal
          onClose={() => setShowCapture(false)}
          onDone={(action) => {
            setShowCapture(false)
            if (action === 'review') setScreen('review')
          }}
        />
      )}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const STATUS_CONFIG: Record<CaptureStatus, { color: string; label: string; animate: boolean }> = {
  idle:       { color: 'var(--color-accent)',   label: 'CAPTURE READY', animate: true },
  capturing:  { color: 'oklch(0.75 0.15 70)',   label: 'CAPTURING…',    animate: true },
  processing: { color: 'oklch(0.75 0.15 70)',   label: 'PROCESSING…',   animate: true },
  done:       { color: 'var(--color-accent)',   label: 'CAPTURE DONE',  animate: false },
  error:      { color: 'oklch(0.65 0.2 25)',    label: 'CAPTURE ERROR', animate: false },
}

function CaptureIndicator({ status, error, lastCount, progress }: { status: CaptureStatus; error: string | null; lastCount: number | null; progress: string | null }) {
  const cfg = STATUS_CONFIG[status]
  return (
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
      title={error || undefined}
    >
      {status === 'error' && error && (
        <span style={{ color: 'oklch(0.65 0.2 25)', fontSize: 10, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {error}
        </span>
      )}
      <span
        className="rounded-full"
        style={{
          width: 6, height: 6,
          background: cfg.color,
          boxShadow: `0 0 8px ${cfg.color}`,
          animation: cfg.animate ? 'pulse 2.4s infinite ease-in-out' : undefined,
        }}
      />
      {cfg.label}
      {status === 'processing' && progress && <span style={{ color: 'oklch(0.75 0.15 70)', marginLeft: 4 }}>{progress} images</span>}
      {status === 'done' && lastCount != null && ` · ${lastCount} cards`}
      {status === 'idle' && <>
        {' · '}<kbd style={kbdStyle}>Alt</kbd>+<kbd style={kbdStyle}>Shift</kbd>+<kbd style={kbdStyle}>S</kbd>
        <span style={{ color: 'var(--color-faint)', margin: '0 4px' }}>to queue</span>
      </>}
    </span>
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

const LOG_COLORS: Record<string, string> = {
  info: 'var(--color-muted)',
  success: 'var(--color-accent)',
  error: 'oklch(0.65 0.2 25)',
}

function CaptureLogPanel({ log, onClear }: { log: LogEntry[]; onClear: () => void }) {
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log.length])

  return (
    <div
      style={{
        height: 180,
        borderTop: '1px solid var(--color-border-soft)',
        background: 'oklch(0.13 0.006 130)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      <div
        className="flex items-center gap-2 shrink-0"
        style={{
          height: 28,
          padding: '0 12px',
          borderBottom: '1px solid var(--color-border-soft)',
          background: 'oklch(0.15 0.006 130)',
        }}
      >
        <IcoTerminal size={12} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em', color: 'var(--color-muted)' }}>
          CAPTURE LOG
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-dim)' }}>
          ({log.length})
        </span>
        <span className="flex-1" />
        <button
          onClick={onClear}
          style={{ color: 'var(--color-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          title="Clear log"
        >
          <IcoTrash />
        </button>
      </div>
      <div className="flex-1 overflow-auto content-scroll" style={{ padding: '6px 12px' }}>
        {log.length === 0 && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-dim)', fontStyle: 'italic' }}>
            No captures yet — press Alt+Shift+S to start
          </span>
        )}
        {log.map((entry) => (
          <div key={entry.id} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: '20px', display: 'flex', gap: 8 }}>
            <span style={{ color: 'var(--color-text-dim)', flexShrink: 0 }}>{entry.time}</span>
            <span style={{ color: LOG_COLORS[entry.level] }}>{entry.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function QueueBadge({ count, onProcess, onClear }: { count: number; onProcess: () => void; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full" style={{
      padding: '3px 6px 3px 10px',
      border: '1px solid oklch(0.55 0.12 70 / 0.5)',
      background: 'oklch(0.20 0.04 70 / 0.35)',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'oklch(0.80 0.12 70)',
      letterSpacing: '0.06em',
    }}>
      <span className="rounded-full" style={{
        width: 6, height: 6,
        background: 'oklch(0.75 0.15 70)',
        boxShadow: '0 0 6px oklch(0.75 0.15 70)',
        animation: 'pulse 2.4s infinite ease-in-out',
      }} />
      {count} QUEUED
      <button
        onClick={onProcess}
        title="Process queue (Alt+Shift+P)"
        style={{
          marginLeft: 4,
          padding: '1px 7px',
          borderRadius: 10,
          background: 'oklch(0.75 0.15 70)',
          color: '#1a1a14',
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.06em',
          cursor: 'pointer',
          border: 'none',
        }}
      >
        ⚡ PROCESS
      </button>
      <button
        onClick={onClear}
        title="Clear queue"
        style={{ color: 'oklch(0.55 0.08 70)', marginLeft: 2, cursor: 'pointer', background: 'none', border: 'none', padding: '0 2px', fontSize: 11 }}
      >
        ✕
      </button>
    </span>
  )
}

export default App
