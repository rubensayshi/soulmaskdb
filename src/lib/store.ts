import { create } from 'zustand'
import type { Tribesman, ProcessResult } from './types'

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
  captureLog: LogEntry[]

  loadRoster: (roster: { last_updated: string; tribesmen: Tribesman[] }) => void
  clearRoster: () => void
  setCaptureStatus: (s: CaptureStatus) => void
  setCaptureError: (e: string) => void
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
  captureLog: [],

  loadRoster: (roster) => set({
    tribesmen: roster.tribesmen,
    lastUpdated: roster.last_updated,
  }),

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

  addCaptureResult: (result) => set((state) => {
    const now = new Date().toISOString()
    const incoming = result.tribesmen.map(t => ({ ...t, captured_at: now }))
    const merged = [...state.tribesmen]
    for (const t of incoming) {
      const idx = merged.findIndex(m => m.name === t.name)
      if (idx >= 0) merged[idx] = t
      else merged.push(t)
    }
    const names = result.tribesmen.map(t => t.name).join(', ')
    return {
      tribesmen: merged,
      lastUpdated: now,
      captureStatus: 'done',
      lastCaptureCount: result.cards_found,
      captureLog: appendLog(state, 'success',
        `Found ${result.cards_found} card${result.cards_found !== 1 ? 's' : ''}, ${result.tribesmen.length} tribesman${result.tribesmen.length !== 1 ? 'en' : ''}${names ? ': ' + names : ''}`
      ),
    }
  }),

  clearLog: () => set({ captureLog: [] }),
}))
