import type { TechSubNode as TechSubNodeType } from '../lib/types'
import TechRecipeCard from './TechRecipeCard'

interface Props {
  node: TechSubNodeType
  isOpen: boolean
  onToggle: () => void
  plannerMode?: boolean
  isSelected?: boolean
  isAutoLearned?: boolean
  prereqsMet?: boolean
  onPlannerToggle?: () => void
}

export default function TechSubNode({ node, isOpen, onToggle, plannerMode, isSelected, isAutoLearned, prereqsMet, onPlannerToggle }: Props) {
  const name = node.name || node.name_zh || node.id

  const handleClick = () => {
    if (plannerMode && !isAutoLearned && onPlannerToggle) {
      onPlannerToggle()
    } else {
      onToggle()
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full flex items-center gap-1.5 rounded px-2 py-1 text-left text-[13px] transition-colors ${
          plannerMode && isAutoLearned
            ? 'bg-panel text-text-dim cursor-default'
            : plannerMode && isSelected
              ? 'bg-green/20 text-green-hi border border-green-dim'
              : plannerMode && !prereqsMet
                ? 'bg-panel text-text-dim opacity-50 hover:opacity-80'
                : isOpen
                  ? 'bg-green-500/10 text-white border border-green-500/30'
                  : 'bg-green-500/[0.06] text-neutral-300 hover:bg-green-500/10'
        }`}
        title={plannerMode && isAutoLearned ? 'Auto-learned (no cost)' : plannerMode && !prereqsMet ? 'Prerequisites not met — click to auto-select chain' : undefined}
      >
        {plannerMode && !isAutoLearned && (
          <span className={`text-[12px] shrink-0 w-3.5 text-center ${isSelected ? 'text-green' : 'text-text-dim'}`}>
            {isSelected ? '✓' : '○'}
          </span>
        )}
        <span className="flex-1 truncate">{name}</span>
        {node.points != null && node.points > 0 && (
          <span className={`text-[12px] shrink-0 ${plannerMode && isSelected ? 'text-green-dim' : 'text-neutral-500'}`}>{node.points}pt</span>
        )}
        {plannerMode && isAutoLearned && (
          <span className="text-[11px] text-text-dim shrink-0 italic">auto</span>
        )}
      </button>

      {isOpen && !plannerMode && (
        <div className="mt-1 mb-1 rounded border border-teal-700 bg-[#1e2d38] p-2">
          <div className="text-xs font-semibold text-white mb-0.5">{name}</div>
          <div className="text-[12px] text-neutral-400 mb-2">
            {node.awareness_level != null && `Awareness ${node.awareness_level}`}
            {node.awareness_level != null && node.points != null && ' · '}
            {node.points != null && `${node.points} tech point${node.points !== 1 ? 's' : ''}`}
          </div>
          {node.recipes.length > 0 ? (
            <>
              <div className="text-[12px] text-neutral-500 mb-1">
                Unlocks {node.recipes.length} recipe{node.recipes.length !== 1 ? 's' : ''}:
              </div>
              <div className="flex flex-col gap-1">
                {node.recipes.map(r => (
                  <TechRecipeCard key={r.recipe_id} recipe={r} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-[12px] text-neutral-500 italic">No linked recipes</div>
          )}
        </div>
      )}
    </div>
  )
}
