import type { TechSubNode as TechSubNodeType } from '../lib/types'
import TechRecipeCard from './TechRecipeCard'

interface Props {
  node: TechSubNodeType
  isOpen: boolean
  onToggle: () => void
}

export default function TechSubNode({ node, isOpen, onToggle }: Props) {
  const name = node.name || node.name_zh || node.id

  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] transition-colors ${
          isOpen
            ? 'bg-green-500/10 text-white border border-green-500/30'
            : 'bg-green-500/[0.06] text-neutral-300 hover:bg-green-500/10'
        }`}
      >
        <span className="flex-1 truncate">{name}</span>
        {node.points != null && (
          <span className="text-neutral-500 text-[10px] shrink-0">{node.points}pt</span>
        )}
      </button>

      {isOpen && (
        <div className="mt-1 mb-1 rounded border border-teal-700 bg-[#1e2d38] p-2">
          <div className="text-xs font-semibold text-white mb-0.5">{name}</div>
          <div className="text-[10px] text-neutral-400 mb-2">
            {node.awareness_level != null && `Awareness ${node.awareness_level}`}
            {node.awareness_level != null && node.points != null && ' · '}
            {node.points != null && `${node.points} tech point${node.points !== 1 ? 's' : ''}`}
          </div>
          {node.recipes.length > 0 ? (
            <>
              <div className="text-[10px] text-neutral-500 mb-1">
                Unlocks {node.recipes.length} recipe{node.recipes.length !== 1 ? 's' : ''}:
              </div>
              <div className="flex flex-col gap-1">
                {node.recipes.map(r => (
                  <TechRecipeCard key={r.recipe_id} recipe={r} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-[10px] text-neutral-500 italic">No linked recipes</div>
          )}
        </div>
      )}
    </div>
  )
}
