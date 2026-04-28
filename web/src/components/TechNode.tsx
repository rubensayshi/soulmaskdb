import { useState, forwardRef } from 'react'
import type { TechMainNode } from '../lib/types'
import TechSubNode from './TechSubNode'

interface Props {
  node: TechMainNode
  isExpanded: boolean
  onToggle: () => void
  highlighted?: boolean
  dimmed?: boolean
}

const TechNode = forwardRef<HTMLDivElement, Props>(
  ({ node, isExpanded, onToggle, highlighted, dimmed }, ref) => {
    const [openSubId, setOpenSubId] = useState<string | null>(null)
    const name = node.name || node.name_zh || node.id

    return (
      <div
        ref={ref}
        data-node-id={node.id}
        className={`rounded-md transition-all ${
          dimmed ? 'opacity-30' : ''
        } ${
          isExpanded
            ? 'border border-green-500 overflow-hidden'
            : highlighted
              ? 'border border-green-500/50'
              : 'border border-neutral-700'
        }`}
      >
        <button
          onClick={onToggle}
          className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-left text-[11px] transition-colors ${
            isExpanded
              ? 'bg-green-500/10 text-green-400 font-semibold'
              : 'bg-white/[0.04] text-neutral-400 hover:bg-white/[0.06]'
          }`}
        >
          <span className={`text-[9px] ${isExpanded ? 'text-green-400' : 'text-neutral-600'}`}>
            {isExpanded ? '▼' : '▶'}
          </span>
          <span className="flex-1 truncate">{name}</span>
          <span className="text-neutral-600 text-[10px] shrink-0">
            {node.sub_nodes.length}
          </span>
        </button>

        {isExpanded && node.sub_nodes.length > 0 && (
          <div className="border-t border-green-500/15 bg-green-500/[0.02] px-1.5 py-1 pl-5 flex flex-col gap-1">
            {node.sub_nodes.map(sub => (
              <TechSubNode
                key={sub.id}
                node={sub}
                isOpen={openSubId === sub.id}
                onToggle={() => setOpenSubId(openSubId === sub.id ? null : sub.id)}
              />
            ))}
          </div>
        )}
      </div>
    )
  }
)

TechNode.displayName = 'TechNode'
export default TechNode
