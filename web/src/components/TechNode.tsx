import { useState, useEffect } from 'react'
import type { TechMainNode } from '../lib/types'
import { isAutoLearned } from '../lib/planner'
import TechSubNode from './TechSubNode'

interface Props {
  node: TechMainNode
  isExpanded: boolean
  onToggle: () => void
  highlighted?: boolean
  dimmed?: boolean
  initialOpenSubId?: string | null
  plannerMode?: boolean
  selectedIds?: Set<string>
  mainPrereqsMet?: boolean
  onPlannerToggleSub?: (subId: string) => void
  onPlannerSelectAll?: (mainNodeId: string) => void
}

export default function TechNode({ node, isExpanded, onToggle, highlighted, dimmed, initialOpenSubId, plannerMode, selectedIds, mainPrereqsMet, onPlannerToggleSub, onPlannerSelectAll }: Props) {
    const [openSubId, setOpenSubId] = useState<string | null>(initialOpenSubId ?? null)

    useEffect(() => {
      if (initialOpenSubId) setOpenSubId(initialOpenSubId)
    }, [initialOpenSubId])
    const name = node.name || node.name_zh || node.id

    const selectableCount = plannerMode ? node.sub_nodes.filter(s => !isAutoLearned(s)).length : 0
    const selectedCount = plannerMode && selectedIds ? node.sub_nodes.filter(s => selectedIds.has(s.id)).length : 0

    const hasSelectedSubs = plannerMode && selectedIds ? node.sub_nodes.some(s => selectedIds.has(s.id)) : false
    const effectiveExpanded = plannerMode ? (isExpanded || hasSelectedSubs) : isExpanded

    return (
      <div
        data-node-id={node.id}
        className={`transition-all ${
          dimmed ? 'opacity-30' : ''
        } ${
          effectiveExpanded
            ? 'border border-green-dim overflow-hidden'
            : highlighted
              ? 'border border-green-dim/50'
              : 'border border-hair'
        }`}
      >
        <div className={`flex items-center overflow-hidden ${
          effectiveExpanded
            ? 'bg-green/10'
            : 'bg-panel'
        }`}>
          <button
            onClick={onToggle}
            className={`flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1.5 text-left text-[11px] transition-colors ${
              effectiveExpanded
                ? 'text-green font-semibold'
                : 'text-text-mute hover:bg-panel-hi'
            }`}
          >
            <span className={`text-[9px] ${effectiveExpanded ? 'text-green' : 'text-text-dim'}`}>
              {effectiveExpanded ? '▼' : '▶'}
            </span>
            <span className="flex-1 truncate">{name}</span>
            {plannerMode && selectableCount > 0 ? (
              <span className={`text-[10px] shrink-0 ${selectedCount > 0 ? 'text-green' : 'text-text-dim'}`}>
                {selectedCount}/{selectableCount}
              </span>
            ) : (
              <span className="text-text-dim text-[10px] shrink-0">
                {node.sub_nodes.length}
              </span>
            )}
          </button>
          {plannerMode && selectableCount > 0 && selectedCount < selectableCount && (
            <button
              onClick={() => onPlannerSelectAll?.(node.id)}
              className="text-[9px] text-text-dim hover:text-green px-1.5 py-1.5 border-l border-hair hover:bg-green/10 transition-colors"
              title="Select all sub-nodes"
            >
              All
            </button>
          )}
        </div>

        {effectiveExpanded && node.sub_nodes.length > 0 && (
          <div className="border-t border-green-dim/15 bg-green/[0.02] px-1.5 py-1 pl-5 flex flex-col gap-1">
            {node.sub_nodes.map(sub => (
              <TechSubNode
                key={sub.id}
                node={sub}
                isOpen={openSubId === sub.id}
                onToggle={() => setOpenSubId(openSubId === sub.id ? null : sub.id)}
                plannerMode={plannerMode}
                isSelected={selectedIds?.has(sub.id)}
                isAutoLearned={isAutoLearned(sub)}
                prereqsMet={mainPrereqsMet !== false}
                onPlannerToggle={() => onPlannerToggleSub?.(sub.id)}
              />
            ))}
          </div>
        )}
      </div>
    )
}
