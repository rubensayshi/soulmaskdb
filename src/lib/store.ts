import { create } from 'zustand'
import type { Tribesman, ProcessResult } from './types'

export type CaptureStatus = 'idle' | 'capturing' | 'processing' | 'done' | 'error'

interface RosterState {
  tribesmen: Tribesman[]
  lastUpdated: string | null
  captureStatus: CaptureStatus
  captureError: string | null
  lastCaptureCount: number | null

  loadRoster: (roster: { last_updated: string; tribesmen: Tribesman[] }) => void
  clearRoster: () => void
  setCaptureStatus: (s: CaptureStatus) => void
  setCaptureError: (e: string) => void
  addCaptureResult: (result: ProcessResult) => void
}

export const useRosterStore = create<RosterState>((set) => ({
  tribesmen: [],
  lastUpdated: null,
  captureStatus: 'idle',
  captureError: null,
  lastCaptureCount: null,

  loadRoster: (roster) => set({
    tribesmen: roster.tribesmen,
    lastUpdated: roster.last_updated,
  }),

  clearRoster: () => set({ tribesmen: [], lastUpdated: null }),

  setCaptureStatus: (s) => set({ captureStatus: s, captureError: null }),

  setCaptureError: (e) => set({ captureStatus: 'error', captureError: e }),

  addCaptureResult: (result) => set((state) => {
    const now = new Date().toISOString()
    const incoming = result.tribesmen.map(t => ({ ...t, captured_at: now }))
    const merged = [...state.tribesmen]
    for (const t of incoming) {
      const idx = merged.findIndex(m => m.name === t.name)
      if (idx >= 0) merged[idx] = t
      else merged.push(t)
    }
    return {
      tribesmen: merged,
      lastUpdated: now,
      captureStatus: 'done',
      lastCaptureCount: result.cards_found,
    }
  }),
}))
