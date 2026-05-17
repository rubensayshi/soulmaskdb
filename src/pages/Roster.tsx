import { useState, useMemo } from 'react'
import { useRosterStore } from '../lib/store'
import { TraitIcon } from '../components/TraitIcon'
import { ReviewPanel } from '../components/ReviewRow'

type SortKey = 'name' | 'level' | 'class' | 'clan' | 'title'
type SortDir = 'asc' | 'desc'

export function Roster() {
  const { tribesmen } = useRosterStore()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let list = tribesmen
    if (q) {
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.clan?.toLowerCase().includes(q)) ||
        (t.title?.toLowerCase().includes(q)) ||
        (t.class?.toLowerCase().includes(q))
      )
    }
    list = [...list].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      const cmp = String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [tribesmen, search, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  return (
    <div>
      <ReviewPanel tribesmen={tribesmen} />

      <div className="flex items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="Filter by name, clan, title..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-tile border border-green/20 rounded px-3 py-1.5 text-sm text-text placeholder-text-dim focus:outline-none focus:border-green/50 w-64"
        />
        <span className="text-text-dim text-sm">
          {filtered.length} tribesman{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-text-dim py-16">
          {tribesmen.length === 0
            ? 'No tribesmen yet. Import a screenshot to get started.'
            : 'No matches for your filter.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-green/20 text-left">
                {(['name', 'level', 'class', 'clan', 'title'] as SortKey[]).map(key => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    className="px-3 py-2 font-medium text-text-dim cursor-pointer hover:text-text select-none capitalize"
                  >
                    {key}{sortIndicator(key)}
                  </th>
                ))}
                <th className="px-3 py-2 font-medium text-text-dim">Traits</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={t.name + i} className="border-b border-green/10 hover:bg-tile/50">
                  <td className="px-3 py-2 font-medium">{t.name}</td>
                  <td className="px-3 py-2">{t.level ?? '—'}</td>
                  <td className="px-3 py-2">{t.class ?? '—'}</td>
                  <td className="px-3 py-2">{t.clan ?? '—'}</td>
                  <td className="px-3 py-2">{t.title ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 flex-wrap">
                      {t.traits.map((tr, j) => (
                        <TraitIcon
                          key={j}
                          iconName={tr.icon_name}
                          confidence={tr.confidence}
                          size={24}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
