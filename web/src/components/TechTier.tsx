import { useRef, useState, useEffect, useCallback } from 'react'
import type { TechTier as TechTierType } from '../lib/types'
import TechNode from './TechNode'

interface Props {
  tier: TechTierType
  expandedNodeId: string | null
  onToggleNode: (id: string) => void
  hoveredNodeId: string | null
  onHoverNode: (id: string | null) => void
}

interface Line {
  fromId: string
  toId: string
  x1: number
  y1: number
  x2: number
  y2: number
}

export default function TechTier({ tier, expandedNodeId, onToggleNode, hoveredNodeId, onHoverNode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [lines, setLines] = useState<Line[]>([])
  const [containerHeight, setContainerHeight] = useState(0)

  const setNodeRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) nodeRefs.current.set(id, el)
    else nodeRefs.current.delete(id)
  }, [])

  const computeLines = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    setContainerHeight(rect.height)
    const newLines: Line[] = []

    for (const node of tier.nodes.right) {
      for (const depId of (node.depends_on || [])) {
        const fromEl = nodeRefs.current.get(depId)
        const toEl = nodeRefs.current.get(node.id)
        if (!fromEl || !toEl) continue

        const fromRect = fromEl.getBoundingClientRect()
        const toRect = toEl.getBoundingClientRect()

        newLines.push({
          fromId: depId,
          toId: node.id,
          x1: fromRect.right - rect.left,
          y1: fromRect.top + fromRect.height / 2 - rect.top,
          x2: toRect.left - rect.left,
          y2: toRect.top + toRect.height / 2 - rect.top,
        })
      }
    }
    setLines(newLines)
  }, [tier])

  useEffect(() => {
    requestAnimationFrame(computeLines)
  }, [computeLines, expandedNodeId])

  useEffect(() => {
    const observer = new ResizeObserver(() => requestAnimationFrame(computeLines))
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [computeLines])

  const isNodeInHoverChain = (nodeId: string) => {
    if (!hoveredNodeId) return false
    if (nodeId === hoveredNodeId) return true
    return lines.some(
      l => (l.fromId === hoveredNodeId && l.toId === nodeId) ||
           (l.toId === hoveredNodeId && l.fromId === nodeId)
    )
  }

  return (
    <div className="flex-none rounded-lg border border-neutral-800 bg-white/[0.01] overflow-hidden">
      <div className="bg-teal-700 text-white px-4 py-2 text-center">
        <div className="text-sm font-bold">{tier.name}</div>
        <div className="text-[10px] opacity-60">Awareness {tier.awareness_level}</div>
      </div>

      <div ref={containerRef} className="relative flex gap-0 p-2" style={{ minWidth: tier.nodes.right.length > 0 ? 384 : 180 }}>
        {lines.length > 0 && (
          <svg
            className="absolute inset-0 pointer-events-none z-10"
            style={{ width: '100%', height: containerHeight || '100%' }}
          >
            {lines.map((line, i) => {
              const active = isNodeInHoverChain(line.fromId) || isNodeInHoverChain(line.toId)
              const dimmed = hoveredNodeId && !active
              return (
                <path
                  key={i}
                  d={`M ${line.x1} ${line.y1} C ${line.x1 + 20} ${line.y1}, ${line.x2 - 20} ${line.y2}, ${line.x2} ${line.y2}`}
                  stroke="#5BC477"
                  strokeWidth={active ? 2 : 1.5}
                  fill="none"
                  opacity={dimmed ? 0.08 : active ? 0.8 : 0.3}
                  className="transition-opacity duration-150"
                />
              )
            })}
          </svg>
        )}

        <div className="flex-none flex flex-col gap-1" style={{ width: 180 }}>
          {tier.nodes.left.map(node => (
            <div
              key={node.id}
              onMouseEnter={() => onHoverNode(node.id)}
              onMouseLeave={() => onHoverNode(null)}
            >
              <TechNode
                ref={setNodeRef(node.id)}
                node={node}
                isExpanded={expandedNodeId === node.id}
                onToggle={() => onToggleNode(node.id)}
                highlighted={isNodeInHoverChain(node.id)}
                dimmed={!!hoveredNodeId && !isNodeInHoverChain(node.id)}
              />
            </div>
          ))}
        </div>

        {tier.nodes.right.length > 0 && (
          <div className="flex-none flex flex-col gap-1" style={{ width: 180, marginLeft: 24 }}>
            {tier.nodes.right.map(node => (
              <div
                key={node.id}
                onMouseEnter={() => onHoverNode(node.id)}
                onMouseLeave={() => onHoverNode(null)}
              >
                <TechNode
                  ref={setNodeRef(node.id)}
                  node={node}
                  isExpanded={expandedNodeId === node.id}
                  onToggle={() => onToggleNode(node.id)}
                  highlighted={isNodeInHoverChain(node.id)}
                  dimmed={!!hoveredNodeId && !isNodeInHoverChain(node.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
