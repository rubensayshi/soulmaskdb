import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useStore } from '../store'
import Icon from './Icon'
import { search as searchApi, type SearchHit } from '../lib/api'

export default function Sidebar() {
  const { id: currentId } = useParams<{ id: string }>()
  const visits = useStore(s => s.recentVisits)
  const graph  = useStore(s => s.graph)

  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])

  useEffect(() => {
    if (!query.trim()) { setHits([]); return }
    const handle = setTimeout(() => {
      searchApi(query.trim()).then(setHits).catch(() => setHits([]))
    }, 150)
    return () => clearTimeout(handle)
  }, [query])

  if (!graph) return <aside className="w-[234px] flex-shrink-0 border-r border-border bg-surface" />
  const byId = new Map(graph.items.map(i => [i.id, i]))
  const showingSearch = query.trim().length > 0

  return (
    <aside className="w-[234px] flex-shrink-0 border-r border-border bg-surface flex flex-col">
      <div className="p-2.5 border-b border-border">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search items…"
          className="w-full bg-panel border border-border px-2.5 py-1.5 text-xs text-text focus:border-gold-dim focus:outline-none placeholder:text-text-dim"
        />
      </div>
      <div className="px-3 pt-2 pb-1 text-[9px] tracking-widest2 uppercase text-text-dim font-semibold">
        {showingSearch ? 'Results' : 'Recent'}
      </div>
      <div className="flex-1 overflow-y-auto pb-2">
        {showingSearch ? (
          hits.length === 0
            ? <div className="px-3 py-2 text-[11px] text-text-dim">No matches.</div>
            : hits.map(hit => {
                const fallback = { id: hit.id, n: hit.name_en, nz: hit.name_zh, cat: hit.category, raw: false }
                const it = byId.get(hit.id) ?? fallback
                const active = hit.id === currentId
                return (
                  <Link
                    key={hit.id}
                    to={`/item/${hit.id}`}
                    onClick={() => setQuery('')}
                    className={`flex items-center gap-2 px-3 py-1.5 border-l-2 ${
                      active ? 'bg-gold-glow border-gold' : 'border-transparent hover:bg-card'
                    }`}
                  >
                    <Icon item={it} size={22} />
                    <div>
                      <div className="text-xs text-text">{hit.name_en ?? hit.name_zh ?? hit.id}</div>
                      {hit.category && <div className="text-[10px] text-text-muted">{hit.category}</div>}
                    </div>
                  </Link>
                )
              })
        ) : visits.length === 0
            ? <div className="px-3 py-2 text-[11px] text-text-dim">Nothing yet. Search or click an item to begin.</div>
            : visits.map(id => {
                const it = byId.get(id)
                const active = id === currentId
                return (
                  <Link
                    key={id}
                    to={`/item/${id}`}
                    className={`flex items-center gap-2 px-3 py-1.5 border-l-2 ${
                      active ? 'bg-gold-glow border-gold' : 'border-transparent hover:bg-card'
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
