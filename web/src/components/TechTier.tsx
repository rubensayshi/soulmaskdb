import type { TechTier as TechTierType } from '../lib/types'
import TechNode from './TechNode'

interface Props {
  tier: TechTierType
  expandedNodeId: string | null
  onToggleNode: (id: string) => void
  hoveredNodeId: string | null
  onHoverNode: (id: string | null) => void
  highlightedNodes?: Set<string>
}

export default function TechTier({ tier, expandedNodeId, onToggleNode, hoveredNodeId, onHoverNode, highlightedNodes }: Props) {
  const isHighlighted = (id: string) => highlightedNodes?.has(id) ?? false
  const isDimmed = (id: string) => !!hoveredNodeId && !isHighlighted(id)

  return (
    <div className="flex-none border border-hair bg-panel overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-hair">
        <svg viewBox="0 0 14 14" className="w-[14px] h-[14px] flex-shrink-0" fill="none" stroke="#8aa074" strokeWidth="1" strokeLinecap="square">
          <path d="M7 1 L13 7 L7 13 L1 7 Z" />
          <path d="M7 4 L10 7 L7 10 L4 7 Z" fill="#8aa074" stroke="none" opacity=".6" />
        </svg>
        <span className="font-display text-[15px] font-semibold text-green-hi tracking-[.04em]">{tier.name}</span>
        <span className="text-[10px] tracking-[.14em] uppercase text-text-dim font-medium">Lv.{tier.awareness_level}</span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #5a6e48 0%, transparent 100%)' }} />
      </div>

      <div className="flex gap-0 p-2" style={{ minWidth: tier.nodes.right.length > 0 ? 384 : 180 }}>
        <div className="flex-none flex flex-col gap-1" style={{ width: 180 }}>
          {tier.nodes.left.map(node => (
            <div
              key={node.id}
              onMouseEnter={() => onHoverNode(node.id)}
              onMouseLeave={() => onHoverNode(null)}
            >
              <TechNode
                node={node}
                isExpanded={expandedNodeId === node.id}
                onToggle={() => onToggleNode(node.id)}
                highlighted={isHighlighted(node.id)}
                dimmed={isDimmed(node.id)}
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
                  node={node}
                  isExpanded={expandedNodeId === node.id}
                  onToggle={() => onToggleNode(node.id)}
                  highlighted={isHighlighted(node.id)}
                  dimmed={isDimmed(node.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
