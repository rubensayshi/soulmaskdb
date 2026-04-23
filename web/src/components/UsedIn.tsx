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
    return <div className="p-8 text-center text-[12px] text-text-dim italic border border-dashed border-hair bg-panel">Not used in any known recipe</div>
  }

  const seen = new Set<string>()
  const directItems = directRecipeIds
    .map(rid => graph.recipes.find(r => r.id === rid))
    .filter((r): r is Recipe => !!r)
    .map(r => r.out)
    .filter(id => seen.has(id) ? false : (seen.add(id), true))

  if (view === 'flow') {
    return (
      <div className="overflow-auto pb-5 mb-5 p-5 border border-hair"
           style={{ background: 'linear-gradient(180deg, #181a16 0%, #161815 100%)' }}>
        <div className="flex flex-col gap-4" style={{ minWidth: 'fit-content' }}>
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
  const hasKids = upstream.length > 0

  if (!item) return null

  return (
    <div className="tree-wrap">
      <div
        className={`group relative flex items-center gap-[11px] px-3 py-2 mb-0.5 border transition-colors bg-panel border-rust-dim hover:bg-panel-2 ${hasKids ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={() => hasKids && setExpanded(v => !v)}
      >
        <span className="w-3 text-rust text-[10px] text-center flex-shrink-0">
          {hasKids ? (expanded ? '▾' : '▸') : ''}
        </span>
        <Icon item={item} size={30} className="rust" />
        <span className="flex-1 text-[13px] text-text truncate">{item.n ?? item.nz ?? item.id}</span>
        {qty != null && <span className="text-[10px] font-semibold text-rust">needs ×{qty}</span>}
        {station?.n && (
          <span className="text-[10px] tracking-[.08em] font-medium px-2 py-[3px] text-green border border-green-soft bg-green-bg flex-shrink-0">
            {station.n}
          </span>
        )}
        <Link
          to={`/item/${item.id}`}
          className="w-[22px] h-[22px] flex items-center justify-center bg-bg border border-hair text-text-mute text-[12px] opacity-0 group-hover:opacity-100 hover:border-rust hover:text-rust transition-all flex-shrink-0"
          onClick={e => e.stopPropagation()}
        >→</Link>
      </div>
      {expanded && hasKids && (
        <div className="tree-kids rust">
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

  const tile = (
    <div className="flex flex-col items-center gap-[7px] flex-shrink-0">
      <Diamond item={item} size={48} variant="rust" onClick={() => nav(`/item/${item.id}?view=flow`)} />
      <div className="flex flex-col items-center gap-[2px] max-w-[110px] text-center">
        <span className="text-[11px] text-rust leading-[1.25] tracking-[.02em]">{item.n ?? item.nz ?? item.id}</span>
        {qty != null && <span className="text-[11px] font-bold text-rust tabular-nums">needs ×{qty}</span>}
        {station?.n && <span className="text-[9px] text-text-dim uppercase tracking-[.1em] font-medium">{station.n}</span>}
      </div>
    </div>
  )

  if (!upstream.length) return tile

  const seen = new Set<string>()
  const children = upstream
    .map(rid => graph.recipes.find(rr => rr.id === rid))
    .filter((r): r is Recipe => !!r)
    .filter(r => seen.has(r.out) ? false : (seen.add(r.out), true))

  return (
    <div className="flex items-center" style={{ minWidth: 'fit-content' }}>
      {tile}
      <div className="w-6 h-px bg-rust-dim flex-shrink-0 self-center" />
      <div className="flex flex-col relative self-stretch justify-center">
        {children.map(r => (
          <div key={r.out} className="flow-branch-item rust flex items-center">
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
