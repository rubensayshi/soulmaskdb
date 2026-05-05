import { useMemo, useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Graph, Item, Recipe } from '../lib/types'
import { buildUsedInIndex, qtyNeeded, indexItems, itemPath, hasMatchingFinal } from '../lib/graph'
import Diamond from './Diamond'

function computeTreeWidths(
  graph: Graph, byId: Map<string, Item>, usedInIdx: Map<string, string[]>,
  filterIds: string[], catFilter?: Set<string>, maxScan = 8
): number[] {
  const widths: number[] = []
  function walk(id: string, depth: number) {
    if (depth >= maxScan) return
    const item = byId.get(id)
    if (!item) return
    if (catFilter && catFilter.size > 0 && item.role !== 'intermediate' && !catFilter.has(item.cat ?? 'other')) return
    while (widths.length <= depth) widths.push(0)
    widths[depth]++
    const upstream = usedInIdx.get(id) ?? []
    const seen = new Set<string>()
    const children = upstream
      .map(rid => graph.recipes.find(rr => rr.id === rid))
      .filter((r): r is Recipe => !!r)
      .filter(r => seen.has(r.out) ? false : (seen.add(r.out), true))
    const visible = catFilter && catFilter.size > 0
      ? children.filter(r => hasMatchingFinal(graph, byId, usedInIdx, r.out, catFilter, depth + 1))
      : children
    for (const r of visible) walk(r.out, depth + 1)
  }
  for (const id of filterIds) walk(id, 0)
  return widths
}

function smartDefaultDepth(widths: number[], limit = 20): number {
  if (widths.length === 0) return 4
  let best = 0
  for (let d = 0; d < widths.length; d++) {
    if (widths[d] <= limit) best = d
    else break
  }
  return best
}

interface Props { graph: Graph; rootId: string; filterIds: string[]; catFilter?: Set<string> }

export default function UsedIn({ graph, rootId, filterIds, catFilter }: Props) {
  const usedInIdx = useMemo(() => buildUsedInIndex(graph), [graph])
  const byId = useMemo(() => indexItems(graph), [graph])
  const ref = useRef<HTMLDivElement>(null)

  const widths = useMemo(
    () => computeTreeWidths(graph, byId, usedInIdx, filterIds, catFilter),
    [graph, byId, usedInIdx, filterIds, catFilter]
  )
  const maxAvail = widths.length
  const defaultDepth = useMemo(() => smartDefaultDepth(widths), [widths])
  const [userDepth, setUserDepth] = useState<number | null>(null)
  const depth = userDepth ?? defaultDepth

  useEffect(() => { setUserDepth(null) }, [rootId, filterIds, catFilter])

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    requestAnimationFrame(() => {
      el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2)
    })
  }, [rootId, filterIds, depth])

  if (filterIds.length === 0) return null

  const showControl = maxAvail > 1

  return (
    <div>
      {showControl && (
        <div className="flex items-center gap-3 mb-2 text-[13px]">
          <span className="text-text-dim tracking-[.06em] uppercase font-medium">Depth</span>
          <div className="flex gap-1">
            {Array.from({ length: maxAvail }, (_, i) => i).map(d => (
              <button key={d} onClick={() => setUserDepth(d)}
                className={`w-6 h-6 text-[13px] font-bold tabular-nums border transition-colors ${
                  d === depth
                    ? 'bg-gold-dim/30 border-gold-dim text-gold'
                    : 'bg-panel border-hair text-text-dim hover:text-text hover:border-text-dim'
                }`}>
                {d + 1}
              </button>
            ))}
          </div>
          <span className="text-text-dim/50 text-[12px] tabular-nums">{widths[depth] ?? 0} items</span>
        </div>
      )}
      <div ref={ref} className="flow-container flow-vert overflow-auto pb-5 mb-5 p-5 border border-hair"
           style={{ background: 'linear-gradient(180deg, #181a16 0%, #161815 100%)' }}>
        <div className="flex flex-row gap-6 justify-center"
             style={{ minWidth: 'fit-content' }}>
          {filterIds.map(id => (
            <UsedInFlowNode key={id} graph={graph} byId={byId} usedInIdx={usedInIdx}
                            id={id} sourceId={rootId} depth={0} maxDepth={depth} catFilter={catFilter} />
          ))}
        </div>
      </div>
    </div>
  )
}

function UsedInFlowNode({ graph, byId, usedInIdx, id, sourceId, depth, maxDepth, catFilter }: {
  graph: Graph; byId: Map<string, Item>; usedInIdx: Map<string, string[]>;
  id: string; sourceId: string; depth: number; maxDepth: number; catFilter?: Set<string>
}) {
  const item = byId.get(id)
  const nav = useNavigate()
  const upstream = usedInIdx.get(id) ?? []
  const recipe = graph.recipes.find(r =>
    r.out === id && r.groups.some(g => g.items.some(it => it.id === sourceId))
  )
  const qty = recipe ? qtyNeeded(recipe, sourceId) : null
  const station = recipe?.st ? graph.stations.find(s => s.id === recipe.st) : undefined

  if (!item || depth > maxDepth) return null
  if (catFilter && catFilter.size > 0 && item.role !== 'intermediate' && !catFilter.has(item.cat ?? 'other')) return null

  const tile = (
    <div className="flex flex-col items-center gap-[7px] flex-shrink-0">
      <Diamond item={item} size={48} variant="rust" onClick={() => nav(itemPath(item))} />
      <div className="flex flex-col items-center gap-[2px] max-w-[110px] text-center">
        <span className="text-[13px] text-rust leading-[1.25] tracking-[.02em]">{item.n ?? item.nz ?? item.id}</span>
        {qty != null && <span className="text-[13px] font-bold text-rust tabular-nums">needs ×{qty}</span>}
        {station?.n && <span className="text-[11px] text-text-dim uppercase tracking-[.1em] font-medium">{station.n}</span>}
      </div>
    </div>
  )

  const seen = new Set<string>()
  const children = upstream
    .map(rid => graph.recipes.find(rr => rr.id === rid))
    .filter((r): r is Recipe => !!r)
    .filter(r => seen.has(r.out) ? false : (seen.add(r.out), true))

  const visible = catFilter && catFilter.size > 0
    ? children.filter(r => hasMatchingFinal(graph, byId, usedInIdx, r.out, catFilter, depth + 1))
    : children

  if (!visible.length) return tile

  return (
    <div className="flex flex-col items-center" style={{ minWidth: 'fit-content' }}>
      {tile}
      <div className="w-px h-6 bg-rust-dim flex-shrink-0 self-center" />
      <div className="flex flex-row relative self-stretch justify-center">
        {visible.map(r => (
          <div key={r.out} className="flow-branch-item rust vert flex flex-col items-center">
            <div className="mt-[14px]">
              <UsedInFlowNode graph={graph} byId={byId} usedInIdx={usedInIdx}
                              id={r.out} sourceId={id} depth={depth + 1} maxDepth={maxDepth} catFilter={catFilter} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
