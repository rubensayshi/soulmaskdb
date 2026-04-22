import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { Graph, Item } from '../lib/types'
import { primaryRecipeFor, indexItems } from '../lib/graph'
import Icon from './Icon'
import { useStore } from '../store'

interface Props {
  graph: Graph
  rootId: string
}

export default function TreeView({ graph, rootId }: Props) {
  const byId = useMemo(() => indexItems(graph), [graph])
  const quantity = useStore(s => s.quantity)
  const orSel    = useStore(s => s.orSel)
  const setOrSel = useStore(s => s.setOrSel)

  const recipe = primaryRecipeFor(graph, rootId)
  if (!recipe) {
    return <div className="h-16 flex items-center justify-center text-[11px] text-text-dim">Raw material — gathered, not crafted</div>
  }

  return (
    <div className="mb-5">
      {recipe.groups.map((grp, gi) => {
        if (grp.kind === 'all') {
          return grp.items.map(ing => (
            <TreeNode key={`${gi}-${ing.id}`} graph={graph} id={ing.id} qty={ing.q * quantity} byId={byId} />
          ))
        }
        const orKey = `${recipe.id}:${gi}`
        const chosen = orSel[orKey] ?? 0
        return (
          <div key={gi} className="ml-2 mb-1 p-2 bg-or-bg border border-or-border">
            <div className="text-[8px] tracking-wider2 uppercase text-or mb-1 font-semibold flex items-center gap-2">
              Choose one
              <span className="flex-1 h-px bg-or-border" />
            </div>
            {grp.items.map((alt, ai) => {
              const item = byId.get(alt.id)
              const active = chosen === ai
              return (
                <div
                  key={alt.id}
                  className={`flex items-center gap-2 px-1.5 py-1 border transition-colors cursor-pointer my-0.5 ${
                    active ? 'bg-[rgba(144,128,204,.14)] border-or' : 'border-transparent hover:bg-[rgba(144,128,204,.1)] hover:border-or-border'
                  }`}
                  onClick={() => setOrSel(orKey, ai)}
                >
                  <Icon item={item} size={22} />
                  <span className="text-xs text-text flex-1">{item?.n ?? item?.nz ?? alt.id}</span>
                  <span className="text-[10px] font-semibold text-or">×{alt.q * quantity}</span>
                </div>
              )
            })}
            {(() => {
              const picked = grp.items[chosen] ?? grp.items[0]
              const subItem = byId.get(picked.id)
              if (!subItem || subItem.raw) return null
              return (
                <div className="ml-2 mt-1 pl-4 border-l border-or-border">
                  <TreeNode graph={graph} id={picked.id} qty={picked.q * quantity} byId={byId} />
                </div>
              )
            })()}
          </div>
        )
      })}
    </div>
  )
}

interface NodeProps {
  graph: Graph
  id: string
  qty: number
  byId: Map<string, Item>
}

function TreeNode({ graph, id, qty, byId }: NodeProps) {
  const item = byId.get(id)
  const recipe = item && !item.raw ? primaryRecipeFor(graph, id) : undefined
  const hasKids = !!recipe && recipe.groups.some(g => g.items.length > 0)
  const [expanded, setExpanded] = useState(hasKids)
  const stationName = useMemo(() => {
    if (!recipe?.st) return null
    return graph.stations.find(s => s.id === recipe.st)?.n ?? null
  }, [graph, recipe])

  if (!item) return null

  return (
    <div>
      <div
        className={`group flex items-center gap-2 px-2 py-1.5 my-px ${hasKids ? 'cursor-pointer' : 'cursor-default'} hover:bg-card`}
        onClick={() => hasKids && setExpanded(v => !v)}
      >
        <span className="w-3 text-[9px] text-text-dim text-center">
          {hasKids ? (expanded ? '▾' : '▸') : ''}
        </span>
        <Icon item={item} size={26} />
        <span className="text-sm text-text flex-1">{item.n ?? item.nz ?? item.id}</span>
        {item.raw && <span className="w-1.5 h-1.5 rotate-45 bg-raw" />}
        {stationName && (
          <span className="text-[9px] text-text-dim px-1 py-px bg-panel">{stationName}</span>
        )}
        <span className="text-xs font-semibold text-gold tabular-nums min-w-[28px] text-right">×{qty}</span>
        {!item.raw && (
          <Link
            to={`/item/${item.id}`}
            onClick={e => e.stopPropagation()}
            className="w-[18px] h-[18px] flex items-center justify-center bg-card text-gold text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
          >→</Link>
        )}
      </div>
      {expanded && recipe && (
        <div className="relative pl-4 ml-4 border-l border-gold-dim">
          {recipe.groups.map((grp, gi) =>
            grp.items.map(ing => (
              <TreeNode key={`${gi}-${ing.id}`} graph={graph} id={ing.id} qty={ing.q * qty} byId={byId} />
            ))
          )}
        </div>
      )}
    </div>
  )
}
