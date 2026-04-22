import { useMemo, useState } from 'react'
import type { Graph } from '../lib/types'
import { computeRawMats } from '../lib/graph'
import { useStore } from '../store'
import { Link } from 'react-router-dom'

interface Props { graph: Graph; rootId: string }

export default function RawMatsCollapsible({ graph, rootId }: Props) {
  const quantity = useStore(s => s.quantity)
  const orSel    = useStore(s => s.orSel)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const mats = useMemo(
    () => computeRawMats(graph, rootId, quantity, orSel),
    [graph, rootId, quantity, orSel]
  )
  const byId = useMemo(() => new Map(graph.items.map(i => [i.id, i])), [graph])
  const entries = Object.entries(mats).sort((a, b) => b[1] - a[1])
  if (!entries.length) return null

  return (
    <div className="mb-5 border border-border">
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-card select-none"
           onClick={() => setOpen(o => !o)}>
        <div className={`w-[7px] h-[7px] rotate-45 border border-raw-border ${open ? 'bg-raw' : 'bg-transparent'}`} />
        <span className="flex-1 text-[9px] tracking-wider2 uppercase text-text-muted font-semibold">Total Raw Materials</span>
        <span className="text-[9px] text-text-dim">{open ? '▴' : '▾'} {entries.length}</span>
      </div>
      {open && (
        <div className="border-t border-border p-1">
          {entries.map(([id, qty]) => {
            const it = byId.get(id)
            return (
              <Link key={id} to={`/item/${id}`} className="flex items-center gap-2 px-2 py-1 hover:bg-card">
                <div className="w-6 h-6 bg-raw-bg border border-raw-border flex items-center justify-center text-[8px] font-semibold text-raw">
                  {(it?.n ?? it?.nz ?? id).slice(0, 2).toUpperCase()}
                </div>
                <span className="flex-1 text-[11px] text-text">{it?.n ?? it?.nz ?? id}</span>
                <span className="text-xs font-semibold text-raw tabular-nums">×{qty}</span>
              </Link>
            )
          })}
          <button
            className={`w-full mt-1 p-1.5 border text-[9px] tracking-wider2 uppercase transition-colors ${
              copied ? 'border-raw-border text-raw' : 'border-border text-text-dim hover:border-gold-dim hover:text-gold'
            }`}
            onClick={() => {
              navigator.clipboard?.writeText(
                entries.map(([id, q]) => `${byId.get(id)?.n ?? id}: ×${q}`).join('\n')
              )
              setCopied(true)
              setTimeout(() => setCopied(false), 1800)
            }}
          >
            {copied ? '✓ Copied' : 'Copy shopping list'}
          </button>
        </div>
      )}
    </div>
  )
}
