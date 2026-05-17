import { create } from 'zustand'
import type { Tribesman, Roster, ProcessResult } from './types'

interface RosterState {
  tribesmen: Tribesman[]
  lastUpdated: string | null
  isProcessing: boolean
  lastResult: ProcessResult | null

  addProcessResult: (result: ProcessResult) => void
  updateTribesman: (name: string, updates: Partial<Tribesman>) => void
  removeTribesman: (name: string) => void
  clearRoster: () => void
  loadRoster: (roster: Roster) => void
  setProcessing: (v: boolean) => void
}

function mergeResults(existing: Tribesman[], incoming: Tribesman[]): Tribesman[] {
  const byName = new Map(existing.map(t => [t.name, t]))
  for (const t of incoming) {
    if (!t.name || t.name.startsWith('[Card')) continue
    byName.set(t.name, { ...t, captured_at: new Date().toISOString() })
  }
  return Array.from(byName.values())
}

export const useRosterStore = create<RosterState>((set) => ({
  tribesmen: [],
  lastUpdated: null,
  isProcessing: false,
  lastResult: null,

  addProcessResult: (result) => set((state) => ({
    tribesmen: mergeResults(state.tribesmen, result.tribesmen),
    lastUpdated: new Date().toISOString(),
    lastResult: result,
    isProcessing: false,
  })),

  updateTribesman: (name, updates) => set((state) => ({
    tribesmen: state.tribesmen.map(t =>
      t.name === name ? { ...t, ...updates } : t
    ),
  })),

  removeTribesman: (name) => set((state) => ({
    tribesmen: state.tribesmen.filter(t => t.name !== name),
  })),

  clearRoster: () => set({ tribesmen: [], lastUpdated: null, lastResult: null }),

  loadRoster: (roster) => set({
    tribesmen: roster.tribesmen,
    lastUpdated: roster.last_updated,
  }),

  setProcessing: (v) => set({ isProcessing: v }),
}))

// Auto-save roster to Tauri backend on changes
let saveTimeout: ReturnType<typeof setTimeout> | null = null
useRosterStore.subscribe((state, prev) => {
  if (state.tribesmen === prev.tribesmen) return
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    import('@tauri-apps/api/core')
      .then(({ invoke }) =>
        invoke('save_roster', {
          roster: {
            last_updated: state.lastUpdated || new Date().toISOString(),
            tribesmen: state.tribesmen,
          },
        })
      )
      .catch(() => {})
  }, 500)
})
