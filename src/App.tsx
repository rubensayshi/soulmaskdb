import { useEffect } from 'react'
import { Roster } from './pages/Roster'
import { CapturePanel } from './components/CapturePanel'
import { useRosterStore } from './lib/store'
import './styles.css'

function App() {
  const { loadRoster } = useRosterStore()

  useEffect(() => {
    import('@tauri-apps/api/core')
      .then(({ invoke }) =>
        invoke<{ last_updated: string; tribesmen: never[] } | null>('load_roster')
      )
      .then(roster => { if (roster) loadRoster(roster) })
      .catch(() => {})
  }, [loadRoster])

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-green/20 px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-green">Screenread</h1>
        <span className="text-text-dim text-sm">Tribesman roster scanner</span>
      </header>
      <div className="p-6">
        <CapturePanel />
        <Roster />
      </div>
    </div>
  )
}

export default App
