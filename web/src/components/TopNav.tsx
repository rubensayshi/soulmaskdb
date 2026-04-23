import { Link, useLocation } from 'react-router-dom'
import markSvg from '../assets/mark.svg'

const TABS = [
  { to: '/', label: 'Recipes', match: (p: string) => p === '/' || p.startsWith('/item/') },
  { to: '/awareness-xp', label: 'Awareness XP', match: (p: string) => p === '/awareness-xp' },
]

export default function TopNav() {
  const { pathname } = useLocation()

  return (
    <div className="relative flex items-center h-14 px-6 flex-shrink-0 border-b border-hair"
         style={{ background: 'linear-gradient(180deg, #0f0d0a 0%, #14110d 100%)' }}>
      <div className="pointer-events-none absolute left-0 right-0 -bottom-px h-px opacity-50"
           style={{ background: 'linear-gradient(90deg, transparent 0%, #5a6e48 20%, #5a6e48 80%, transparent 100%)' }} />

      <Link to="/" className="flex items-center gap-3 pr-6">
        <img src={markSvg} alt="Soulmask Codex" className="w-[34px] h-[34px]" />
        <div className="flex flex-col leading-none">
          <span className="font-display text-[17px] font-semibold text-text tracking-[.08em]">Soulmask</span>
          <span className="text-[9px] text-text-dim tracking-widest2 uppercase mt-[3px]">Codex</span>
        </div>
      </Link>

      <div className="w-px h-8 bg-hair mx-1" />

      <div className="flex items-stretch h-full ml-4">
        {TABS.map(tab => {
          const active = tab.match(pathname)
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`relative px-[22px] flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[.15em] bg-transparent transition-colors ${active ? 'text-text' : 'text-text-mute hover:text-text'}`}
            >
              {tab.label}
              {active && (
                <span className="absolute left-[18%] right-[18%] bottom-0 h-[2px] bg-green"
                      style={{ boxShadow: '0 0 8px rgba(138,160,116,.4)' }} />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
