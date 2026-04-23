import { useParams } from 'react-router-dom'
import { useEffect, useMemo } from 'react'
import { useStore } from '../store'
import { primaryRecipeFor } from '../lib/graph'
import ItemHeader from '../components/ItemHeader'
import TreeView from '../components/TreeView'
import FlowView from '../components/FlowView'
import RawMatsCollapsible from '../components/RawMats'
import UsedIn from '../components/UsedIn'

export default function Item() {
  const { id } = useParams<{ id: string }>()

  const pushVisit  = useStore(s => s.pushVisit)
  const resetOrSel = useStore(s => s.resetOrSel)
  const graph      = useStore(s => s.graph)
  const tweaks     = useStore(s => s.tweaks)

  const view = tweaks.viewMode

  useEffect(() => { if (id) { pushVisit(id); resetOrSel() } }, [id, pushVisit, resetOrSel])

  const item = useMemo(() => graph?.items.find(i => i.id === id), [graph, id])
  const recipe = useMemo(() => graph && id ? primaryRecipeFor(graph, id) : undefined, [graph, id])
  const station = useMemo(
    () => recipe?.st ? graph?.stations.find(s => s.id === recipe.st) : undefined,
    [graph, recipe]
  )

  if (!graph) return <div className="p-8 text-text-dim">Loading…</div>
  if (!item) return <div className="p-8 text-text-dim">Item not found: {id}</div>

  return (
    <div>
      <ItemHeader item={item} recipe={recipe} station={station} />
      {recipe && (
        <>
          <SectionHeader title="Materials Required" sub="Direct Ingredients" accent="green" />
          {view === 'tree'
            ? <TreeView graph={graph} rootId={item.id} />
            : <FlowView graph={graph} rootId={item.id} orient={tweaks.flowOrient} />}
          {tweaks.showRaw && <RawMatsCollapsible graph={graph} rootId={item.id} />}
        </>
      )}
      <SectionHeader title="Used as Ingredient" sub="Downstream Recipes" accent="rust" />
      <UsedIn graph={graph} rootId={item.id} view={view} orient={tweaks.flowOrient} />
    </div>
  )
}

function Ornament({ accent }: { accent: 'green' | 'rust' }) {
  const color = accent === 'green' ? '#8aa074' : '#a67a52'
  return (
    <svg viewBox="0 0 14 14" className="w-[14px] h-[14px]" fill="none" stroke={color} strokeWidth="1" strokeLinecap="square">
      <path d="M7 1 L13 7 L7 13 L1 7 Z" />
      <path d="M7 4 L10 7 L7 10 L4 7 Z" fill={color} stroke="none" opacity=".6" />
    </svg>
  )
}

function SectionHeader({ title, sub, accent }: { title: string; sub: string; accent: 'green' | 'rust' }) {
  const gradient = accent === 'green'
    ? 'linear-gradient(90deg, #5a6e48 0%, transparent 100%)'
    : 'linear-gradient(90deg, #6e4d2e 0%, transparent 100%)'
  return (
    <div className="flex items-center gap-3.5 mt-7 mb-4">
      <Ornament accent={accent} />
      <span className="font-display text-[16px] font-semibold text-text tracking-[.04em] flex-shrink-0">{title}</span>
      <span className="text-[10px] tracking-[.14em] uppercase text-text-dim font-medium ml-1.5 flex-shrink-0">{sub}</span>
      <div className="flex-1 h-px" style={{ background: gradient }} />
    </div>
  )
}
