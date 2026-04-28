import { useEffect, useState, useRef, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { useParams } from 'react-router-dom'
import { fetchTechTree } from '../lib/api'
import type { TechTreeResponse, TechMode, TechMainNode } from '../lib/types'
import TechTier from '../components/TechTier'
import TechNode from '../components/TechNode'

const MODES: { key: TechMode; label: string }[] = [
  { key: 'survival', label: 'Survival' },
  { key: 'soldier', label: 'Soldier' },
  { key: 'management', label: 'Management' },
]

export default function TechTree() {
  const { slug } = useParams<{ slug?: string }>()

  const [mode, setMode] = useState<TechMode>('survival')
  const [data, setData] = useState<TechTreeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchTechTree(mode)
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [mode])

  useEffect(() => {
    if (!slug || !data) return

    for (const tier of data.tiers) {
      const allNodes = [...tier.nodes.left, ...tier.nodes.right]
      for (const node of allNodes) {
        if (node.slug === slug) {
          setExpandedNodeId(node.id)
          setTimeout(() => {
            const el = document.querySelector(`[data-node-id="${node.id}"]`)
            el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
          }, 100)
          return
        }
        for (const sub of node.sub_nodes) {
          if (sub.slug === slug) {
            setExpandedNodeId(node.id)
            setTimeout(() => {
              const el = document.querySelector(`[data-node-id="${node.id}"]`)
              el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
            }, 100)
            return
          }
        }
      }
    }
  }, [slug, data])

  const handleToggleNode = useCallback((id: string) => {
    setExpandedNodeId(prev => prev === id ? null : id)
  }, [])

  const matchesSearch = useCallback((node: TechMainNode): boolean => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    if ((node.name || '').toLowerCase().includes(q)) return true
    if ((node.name_zh || '').includes(searchQuery)) return true
    return node.sub_nodes.some(
      s => (s.name || '').toLowerCase().includes(q) || (s.name_zh || '').includes(searchQuery)
    )
  }, [searchQuery])

  return (
    <>
      <Helmet>
        <title>Tech Tree — Soulmask Codex</title>
        <meta name="description" content="Explore the full Soulmask tech tree — every node, unlock requirement, and recipe it grants." />
        <link rel="canonical" href="https://soulmask-codex.fly.dev/tech-tree" />
        <meta property="og:title" content="Tech Tree — Soulmask Codex" />
        <meta property="og:description" content="Explore the full Soulmask tech tree — every node, unlock requirement, and recipe it grants." />
        <meta property="og:url" content="https://soulmask-codex.fly.dev/tech-tree" />
        <meta name="twitter:title" content="Tech Tree — Soulmask Codex" />
        <meta name="twitter:description" content="Explore the full Soulmask tech tree — every node, unlock requirement, and recipe it grants." />
      </Helmet>

      <div className="-mx-9 -mt-7">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-neutral-800 bg-[#16212B]/95 backdrop-blur px-4 py-2.5">
          <h1 className="text-sm font-bold text-white mr-2">Tech Tree</h1>

          <div className="flex gap-1">
            {MODES.map(m => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  mode === m.key
                    ? 'bg-teal-700 text-white'
                    : 'bg-white/[0.05] text-neutral-500 border border-neutral-700 hover:text-neutral-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <input
            type="text"
            placeholder="Search tech nodes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-52 rounded border border-neutral-700 bg-white/[0.05] px-3 py-1 text-xs text-neutral-300 placeholder-neutral-600 outline-none focus:border-teal-600"
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20 text-neutral-500 text-sm">Loading...</div>
        )}
        {error && (
          <div className="flex items-center justify-center py-20 text-red-400 text-sm">{error}</div>
        )}

        {data && (
          <div
            ref={scrollContainerRef}
            className="flex gap-0.5 p-3 overflow-x-auto items-start"
          >
            {data.tiers.map(tier => {
              const hasMatch = !searchQuery || [...tier.nodes.left, ...tier.nodes.right].some(matchesSearch)
              return (
                <div
                  key={tier.id}
                  className={`transition-opacity ${hasMatch ? '' : 'opacity-20 pointer-events-none'}`}
                >
                  <TechTier
                    tier={searchQuery ? {
                      ...tier,
                      nodes: {
                        left: tier.nodes.left.filter(matchesSearch),
                        right: tier.nodes.right.filter(matchesSearch),
                      },
                    } : tier}
                    expandedNodeId={expandedNodeId}
                    onToggleNode={handleToggleNode}
                    hoveredNodeId={hoveredNodeId}
                    onHoverNode={setHoveredNodeId}
                  />
                </div>
              )
            })}
          </div>
        )}

        {data && data.untiered.length > 0 && (
          <div className="px-3 pb-6">
            <div className="rounded-lg border border-neutral-800 bg-white/[0.01] overflow-hidden" style={{ maxWidth: 400 }}>
              <div className="bg-neutral-800 text-neutral-300 px-4 py-2 text-center text-sm font-semibold">
                Guardian Armor Sets
                <div className="text-[10px] text-neutral-500 font-normal">No tier prerequisite</div>
              </div>
              <div className="p-2 flex flex-col gap-1">
                {data.untiered.map(node => (
                  <TechNode
                    key={node.id}
                    node={node}
                    isExpanded={expandedNodeId === node.id}
                    onToggle={() => handleToggleNode(node.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
