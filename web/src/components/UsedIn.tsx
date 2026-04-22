import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Graph, Item, Recipe } from '../lib/types'
import { buildUsedInIndex, qtyNeeded, indexItems } from '../lib/graph'
import Diamond from './Diamond'
import Icon from './Icon'

interface Props { graph: Graph; rootId: string; view: 'tree' | 'flow' }

export default function UsedIn({ graph, rootId, view }: Props) {
  const usedInIdx = useMemo(() => buildUsedInIndex(graph), [graph])
  const byId = useMemo(() => indexItems(graph), [graph])

  const directRecipeIds = usedInIdx.get(rootId) ?? []
  if (directRecipeIds.length === 0) {
    return <div className="h-16 flex items-center justify-center text-[11px] text-text-dim">Not used in any known recipe</div>
  }

  // Dedupe by produced item — multiple recipes can produce the same output
  const seen = new Set<string>()
  const directItems = directRecipeIds
    .map(rid => graph.recipes.find(r => r.id === rid))
    .filter((r): r is Recipe => !!r)
    .map(r => r.out)
    .filter(id => seen.has(id) ? false : (seen.add(id), true))

  if (view === 'flow') {
    return (
      <div className="overflow-x-auto pb-5 mb-5">
        <div className="flex flex-col gap-3">
          {directItems.map(id => (
            <UsedInFlowNode key={id} graph={graph} byId={byId} usedInIdx={usedInIdx}
                            id={id} sourceId={rootId} depth={0} />
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="mb-5">
      {directItems.map(id => (
        <UsedInTreeNode key={id} graph={graph} byId={byId} usedInIdx={usedInIdx}
                        id={id} sourceId={rootId} depth={0} />
      ))}
    </div>
  )
}

function UsedInTreeNode({ graph, byId, usedInIdx, id, sourceId, depth }: {
  graph: Graph; byId: Map<string, Item>; usedInIdx: Map<string, string[]>;
  id: string; sourceId: string; depth: number
}) {
  const item = byId.get(id)
  const [expanded, setExpanded] = useState(false)
  const upstream = usedInIdx.get(id) ?? []
  const recipe = graph.recipes.find(r =>
    r.out === id && r.groups.some(g => g.items.some(it => it.id === sourceId))
  )
  const qty = recipe ? qtyNeeded(recipe, sourceId) : null
  const station = recipe?.st ? graph.stations.find(s => s.id === recipe.st) : undefined

  if (!item) return null

  return (
    <div>
      <div
        className={`group flex items-center gap-2 px-2 py-1.5 my-px hover:bg-jade-bg ${upstream.length > 0 ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={() => upstream.length > 0 && setExpanded(v => !v)}
      >
        <span className="w-3 text-[9px] text-jade text-center">
          {upstream.length > 0 ? (expanded ? '▾' : '▸') : ''}
        </span>
        <Icon item={item} size={24} className="border-jade-border bg-jade-bg" />
        <span className="flex-1 text-sm text-text">{item.n ?? item.nz ?? item.id}</span>
        {qty != null && <span className="text-[10px] font-semibold text-jade">×{qty}</span>}
        {station?.n && <span className="text-[9px] text-jade px-1 py-px bg-jade-bg">{station.n}</span>}
        <Link
          to={`/item/${item.id}`}
          className="w-[18px] h-[18px] flex items-center justify-center bg-jade-bg text-jade text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={e => e.stopPropagation()}
        >→</Link>
      </div>
      {expanded && (
        <div className="relative pl-4 ml-4 border-l border-jade-border">
          {(() => {
            const seen = new Set<string>()
            return upstream.map(rid => {
              const r = graph.recipes.find(rr => rr.id === rid)
              if (!r || seen.has(r.out)) return null
              seen.add(r.out)
              return (
                <UsedInTreeNode key={r.out} graph={graph} byId={byId} usedInIdx={usedInIdx}
                                id={r.out} sourceId={id} depth={depth + 1} />
              )
            })
          })()}
        </div>
      )}
    </div>
  )
}

function UsedInFlowNode({ graph, byId, usedInIdx, id, sourceId, depth }: {
  graph: Graph; byId: Map<string, Item>; usedInIdx: Map<string, string[]>;
  id: string; sourceId: string; depth: number
}) {
  const item = byId.get(id)
  const nav = useNavigate()
  const upstream = usedInIdx.get(id) ?? []
  const recipe = graph.recipes.find(r =>
    r.out === id && r.groups.some(g => g.items.some(it => it.id === sourceId))
  )
  const qty = recipe ? qtyNeeded(recipe, sourceId) : null
  const station = recipe?.st ? graph.stations.find(s => s.id === recipe.st) : undefined

  if (!item || depth > 4) return null

  const diamond = (
    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
      <Diamond item={item} size={42} variant="jade" onClick={() => nav(`/item/${item.id}?view=flow`)} />
      <div className="flex flex-col items-center gap-[1px]">
        <span className="text-[10px] text-center leading-tight max-w-[88px] text-jade">{item.n ?? item.nz ?? item.id}</span>
        {qty != null && <span className="text-[10px] font-bold text-jade tabular-nums">×{qty}</span>}
        {station?.n && <span className="text-[9px] text-text-dim">{station.n}</span>}
      </div>
    </div>
  )

  if (!upstream.length) return diamond

  const seen = new Set<string>()
  const children = upstream
    .map(rid => graph.recipes.find(rr => rr.id === rid))
    .filter((r): r is Recipe => !!r)
    .filter(r => seen.has(r.out) ? false : (seen.add(r.out), true))

  return (
    <div className="flex items-center">
      {diamond}
      <div className="w-7 h-px bg-jade-border flex-shrink-0" />
      <div className="flex flex-col gap-2 relative flow-branch jade">
        {children.map(r => (
          <div key={r.out} className="flex items-center relative flow-branch-item jade">
            <div className="ml-[14px]">
              <UsedInFlowNode graph={graph} byId={byId} usedInIdx={usedInIdx}
                              id={r.out} sourceId={id} depth={depth + 1} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
