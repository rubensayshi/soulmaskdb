import { estimateLevel, MAX_POINTS } from '../lib/planner'

interface Props {
  pointsSpent: number
  nodeCount: number
  onShare: () => void
  onClear: () => void
}

export default function PlannerBudgetBar({ pointsSpent, nodeCount, onShare, onClear }: Props) {
  const { level, tablets } = estimateLevel(pointsSpent)
  const pct = Math.min(100, (pointsSpent / MAX_POINTS) * 100)

  return (
    <div className="flex items-center gap-3 text-[11px]">
      <span className="text-text font-semibold">{pointsSpent} pts</span>
      <span className="text-text-dim">{nodeCount} node{nodeCount !== 1 ? 's' : ''}</span>

      <div className="flex-1 h-1.5 bg-panel-2 rounded-full overflow-hidden max-w-[200px]">
        <div
          className="h-full bg-green rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {pointsSpent > 0 && (
        <span className="text-text-mute">
          &asymp; Level {level}{tablets > 0 && ` + ~${tablets} tablet pts`}
        </span>
      )}

      <div className="flex gap-1 ml-auto">
        <button
          onClick={onShare}
          className="px-2 py-0.5 border border-hair text-text-mute hover:text-text hover:border-green-dim transition-colors"
          title="Copy shareable URL"
        >
          Share
        </button>
        <button
          onClick={onClear}
          className="px-2 py-0.5 border border-hair text-text-dim hover:text-rust hover:border-rust-dim transition-colors"
          title="Clear all selections"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
