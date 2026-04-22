import { useSearchParams, Link } from 'react-router-dom'

export default function TopNav() {
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'tree' ? 'tree' : 'flow'
  const setView = (v: 'tree' | 'flow') => {
    const next = new URLSearchParams(params)
    if (v === 'flow') next.delete('view')
    else next.set('view', v)
    setParams(next, { replace: true })
  }
  return (
    <div className="flex items-center gap-3 h-12 px-5 bg-surface border-b border-border flex-shrink-0">
      <Link to="/" className="flex items-center gap-2 font-display text-sm font-bold tracking-wider2 text-gold">
        <div className="diamond border-[1.5px] border-gold w-[22px] h-[22px]">
          <div className="diamond-inner text-[10px] text-gold">◈</div>
        </div>
        Soulmask
      </Link>
      <div className="w-px h-4 bg-border" />
      <span className="text-[10px] text-text-dim tracking-widest2 uppercase">Codex · Recipe Tree</span>
      <div className="flex-1" />
      <div className="flex border border-border overflow-hidden">
        <button
          className={`px-4 py-1 text-[10px] tracking-wider2 uppercase font-semibold border-r border-border ${
            view === 'tree' ? 'bg-card text-gold' : 'text-text-dim hover:text-text-muted'
          }`}
          onClick={() => setView('tree')}
        >Tree</button>
        <button
          className={`px-4 py-1 text-[10px] tracking-wider2 uppercase font-semibold ${
            view === 'flow' ? 'bg-card text-gold' : 'text-text-dim hover:text-text-muted'
          }`}
          onClick={() => setView('flow')}
        >Flow</button>
      </div>
    </div>
  )
}
