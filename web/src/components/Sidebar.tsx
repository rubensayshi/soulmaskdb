import { Link, useParams } from 'react-router-dom'
import { useStore } from '../store'
import Icon from './Icon'

export default function Sidebar() {
  const { id: currentId } = useParams<{ id: string }>()
  const visits = useStore(s => s.recentVisits)
  const graph  = useStore(s => s.graph)
  if (!graph) return <aside className="w-[234px] flex-shrink-0 border-r border-border bg-surface" />

  const byId = new Map(graph.items.map(i => [i.id, i]))

  return (
    <aside className="w-[234px] flex-shrink-0 border-r border-border bg-surface flex flex-col">
      <div className="px-3 pt-2 pb-1 text-[9px] tracking-widest2 uppercase text-text-dim font-semibold">
        Recent
      </div>
      <div className="flex-1 overflow-y-auto pb-2">
        {visits.length === 0 && (
          <div className="px-3 py-2 text-[11px] text-text-dim">
            Nothing yet. Click an item to begin.
          </div>
        )}
        {visits.map(id => {
          const it = byId.get(id)
          const active = id === currentId
          return (
            <Link
              key={id}
              to={`/item/${id}`}
              className={`flex items-center gap-2 px-3 py-1.5 border-l-2 ${
                active
                  ? 'bg-gold-glow border-gold'
                  : 'border-transparent hover:bg-card'
              }`}
            >
              <Icon item={it} size={22} />
              <div>
                <div className="text-xs text-text">{it?.n ?? it?.nz ?? id}</div>
                {it?.cat && <div className="text-[10px] text-text-muted">{it.cat}</div>}
              </div>
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
