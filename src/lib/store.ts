import { create } from 'zustand'
import type { Tribesman, ProcessResult, TraitMatch, ClanName, StatusType } from './types'
import { TRAIT_BY_ICON } from './data'
import { getBestTrait } from './traits'

// ── Sidecar output shape (class instead of klass, group/status as strings, no id/prof) ──
interface RawTribesman {
  name?: string
  level?: number | null
  class?: string | null
  klass?: string | null
  clan?: string | null
  title?: string | null
  status?: string | null
  group?: string | null
  location?: string | null
  traits?: Array<{ icon_name: string; confidence: number }>
  prof?: number[]
}

function normalizeClan(raw: string | null | undefined): ClanName {
  const known: ClanName[] = ['Claw', 'Flint', 'Fang', 'Wolf', 'Horn', 'Exile', 'DLC']
  if (!raw) return 'Exile'
  const match = known.find(c => c.toLowerCase() === raw.toLowerCase())
  if (match) return match
  const remaps: Record<string, ClanName> = { outcast: 'Exile', long: 'Horn' }
  return remaps[raw.toLowerCase()] ?? 'Exile'
}

function normalizeStatus(raw: string | null | undefined): StatusType {
  if (!raw) return 'idle'
  const map: Record<string, StatusType> = {
    'idle': 'idle', 'hosting': 'hosting', 'mining': 'mining',
    'resting': 'resting', 'work break': 'work-break',
  }
  return map[raw.toLowerCase()] ?? 'idle'
}

function normalizeTribesman(raw: RawTribesman, capturedAt: string): Tribesman {
  const rawTraits = raw.traits ?? []
  const traits: TraitMatch[] = rawTraits.map(t => {
    const def = TRAIT_BY_ICON[t.icon_name]
    const info = getBestTrait(t.icon_name)
    return {
      icon_name: t.icon_name,
      confidence: t.confidence,
      id: def?.id ?? t.icon_name,
      name: def?.name ?? t.icon_name,
      shape: def?.shape ?? 'hexagon',
      eff: def?.eff ?? '',
      star: info?.star ?? 1,
    }
  })
  const name = String(raw.name ?? '')
  return {
    id: name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '_') : `tm_${Date.now()}`,
    name,
    level: raw.level ?? 0,
    klass: String(raw.class ?? raw.klass ?? ''),
    clan: normalizeClan(raw.clan),
    group: raw.group ?? 'unassigned',
    title: raw.title ?? '—',
    location: raw.location ?? '',
    status: normalizeStatus(raw.status),
    traits,
    prof: raw.prof ?? Array(8).fill(0),
    captured_at: capturedAt,
  }
}

export type CaptureStatus = 'idle' | 'capturing' | 'processing' | 'done' | 'error'

export type LogLevel = 'info' | 'success' | 'error'

export interface LogEntry {
  id: number
  time: string
  level: LogLevel
  message: string
}

let logSeq = 0

interface RosterState {
  tribesmen: Tribesman[]
  lastUpdated: string | null
  captureStatus: CaptureStatus
  captureError: string | null
  lastCaptureCount: number | null
  queueCount: number
  processProgress: string | null
  captureLog: LogEntry[]

  loadRoster: (roster: { last_updated: string; tribesmen: unknown[] }) => void
  clearRoster: () => void
  setCaptureStatus: (s: CaptureStatus) => void
  setCaptureError: (e: string) => void
  setQueueCount: (n: number) => void
  setProgress: (p: string | null) => void
  logQueuedPath: (path: string) => void
  addCaptureResult: (result: ProcessResult) => void
  clearLog: () => void
}

function appendLog(state: { captureLog: LogEntry[] }, level: LogLevel, message: string): LogEntry[] {
  const entry: LogEntry = {
    id: ++logSeq,
    time: new Date().toLocaleTimeString('en-GB', { hour12: false }),
    level,
    message,
  }
  return [...state.captureLog, entry]
}

export const useRosterStore = create<RosterState>((set) => ({
  tribesmen: [],
  lastUpdated: null,
  captureStatus: 'idle',
  captureError: null,
  lastCaptureCount: null,
  queueCount: 0,
  processProgress: null,
  captureLog: [],

  loadRoster: (roster) => {
    const now = new Date().toISOString()
    const tribesmen = (roster.tribesmen as unknown[]).map(t => {
      const raw = t as RawTribesman & { id?: string; star?: number }
      // Already-normalized entries have an `id` field; pass through normalization
      // regardless — it's idempotent and handles both old and new shapes.
      return normalizeTribesman(raw, (raw as { captured_at?: string }).captured_at ?? now)
    })
    return set({ tribesmen, lastUpdated: roster.last_updated })
  },

  clearRoster: () => set({ tribesmen: [], lastUpdated: null }),

  setCaptureStatus: (s) => set((state) => ({
    captureStatus: s,
    captureError: null,
    captureLog: appendLog(state, 'info',
      s === 'capturing' ? 'Hotkey triggered — capturing screen…'
      : s === 'processing' ? 'Screenshot saved — running OCR…'
      : `Status: ${s}`
    ),
  })),

  setCaptureError: (e) => set((state) => ({
    captureStatus: 'error',
    captureError: e,
    captureLog: appendLog(state, 'error', e),
  })),

  setQueueCount: (n) => set((state) => {
    if (n === state.queueCount) return {}
    const msg = n === 0
      ? 'Queue cleared'
      : `Screenshot ${n} queued — Alt+Shift+P to process`
    return {
      queueCount: n,
      captureLog: appendLog(state, 'info', msg),
    }
  }),

  setProgress: (p) => set({ processProgress: p }),

  logQueuedPath: (path) => set((state) => ({
    captureLog: appendLog(state, 'info', `Saved: ${path}`),
  })),

  addCaptureResult: (result) => set((state) => {
    try {
      const now = new Date().toISOString()
      const incoming = result.tribesmen.map(t => normalizeTribesman(t as unknown as RawTribesman, now))
      const merged = [...state.tribesmen]
      for (const t of incoming) {
        const idx = merged.findIndex(m => m.name === t.name)
        if (idx >= 0) merged[idx] = t
        else merged.push(t)
      }
      const names = incoming.map(t => t.name).join(', ')
      return {
        tribesmen: merged,
        lastUpdated: now,
        captureStatus: 'done',
        processProgress: null,
        lastCaptureCount: result.cards_found,
        captureLog: appendLog(state, 'success',
          `Found ${result.cards_found} card${result.cards_found !== 1 ? 's' : ''}, ${incoming.length} tribesman${incoming.length !== 1 ? 'en' : ''}${names ? ': ' + names : ''}`
        ),
      }
    } catch (err) {
      const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err)
      return {
        captureStatus: 'error' as CaptureStatus,
        captureError: String(err),
        captureLog: appendLog(state, 'error', `Normalization failed: ${msg}`),
      }
    }
  }),

  clearLog: () => set({ captureLog: [] }),
}))
