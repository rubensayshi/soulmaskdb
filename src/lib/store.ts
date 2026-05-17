import { create } from 'zustand'
import type { Tribesman } from './types'

interface RosterState {
  tribesmen: Tribesman[]
  lastUpdated: string | null
  isProcessing: boolean

  loadRoster: (roster: { last_updated: string; tribesmen: Tribesman[] }) => void
  clearRoster: () => void
  setProcessing: (v: boolean) => void
}

export const useRosterStore = create<RosterState>((set) => ({
  tribesmen: [],
  lastUpdated: null,
  isProcessing: false,

  loadRoster: (roster) => set({
    tribesmen: roster.tribesmen,
    lastUpdated: roster.last_updated,
  }),

  clearRoster: () => set({ tribesmen: [], lastUpdated: null }),

  setProcessing: (v) => set({ isProcessing: v }),
}))
