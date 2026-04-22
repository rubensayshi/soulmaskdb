import { Link } from 'react-router-dom'
import { useStore } from '../store'

// Hand-picked featured items that make good recipe-tree demos.
const FEATURED: { id: string; label: string; blurb: string }[] = [
  { id: 'Daoju_Item_TieDing',  label: 'Iron Ingot',     blurb: 'Smelted from iron ore and carbon powder in the Blast Furnace.' },
  { id: 'BP_GongJu_FuZi_4',    label: 'Iron Axe',       blurb: 'A top-tier gathering tool. Follow the chain from iron ore + hardwood + leather.' },
  { id: 'DaoJu_Item_PiGe_3',   label: 'Premium Leather', blurb: 'A multi-step tanning chain from raw hide to finished leather.' },
  { id: 'Daoju_Item_GangDing', label: 'Steel Ingot',    blurb: 'Iron ingots refined with coal — prerequisite for steel weapons and armor.' },
]

export default function Home() {
  const graph = useStore(s => s.graph)
  const status = useStore(s => s.graphStatus)
  if (status === 'loading' || !graph) return <div className="p-8">Loading…</div>

  const have = new Set(graph.items.map(i => i.id))
  const available = FEATURED.filter(f => have.has(f.id))

  return (
    <div className="p-10 max-w-2xl">
      <h1 className="font-display text-3xl text-gold mb-2 tracking-wide">Soulmask · Recipe Tree</h1>
      <p className="text-text-muted mb-8">
        Browse {graph.items.length.toLocaleString()} items and {graph.recipes.length.toLocaleString()} crafting recipes.
        Click any ingredient to trace its chain.
      </p>

      <h2 className="font-display text-sm text-gold tracking-wider2 uppercase mb-3">Featured chains</h2>
      <div className="grid gap-3">
        {available.map(f => (
          <Link
            key={f.id}
            to={`/item/${f.id}`}
            className="block p-4 bg-panel border border-border-lit hover:border-gold-dim transition-colors"
          >
            <div className="font-display text-base text-text mb-1">{f.label}</div>
            <div className="text-xs text-text-muted">{f.blurb}</div>
          </Link>
        ))}
        {available.length === 0 && (
          <p className="text-text-dim text-xs">
            Featured items aren't in the database yet — use the sidebar search to find something.
          </p>
        )}
      </div>
    </div>
  )
}
