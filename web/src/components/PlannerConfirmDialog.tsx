import type { TechSubNode } from '../lib/types'

interface Props {
  type: 'select' | 'deselect'
  nodes: TechSubNode[]
  totalPoints: number
  onConfirm: () => void
  onCancel: () => void
}

export default function PlannerConfirmDialog({ type, nodes, totalPoints, onConfirm, onCancel }: Props) {
  const isSelect = type === 'select'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div
        className="w-full max-w-sm border border-hair bg-bg rounded p-4 shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-xs font-semibold text-text mb-2">
          {isSelect ? 'Prerequisites required' : 'Dependent nodes will be removed'}
        </div>
        <div className="text-[11px] text-text-mute mb-3">
          {isSelect
            ? `Selecting this node also requires ${nodes.length} prerequisite${nodes.length !== 1 ? 's' : ''} (${totalPoints} pts total):`
            : `Removing this node also removes ${nodes.length} dependent node${nodes.length !== 1 ? 's' : ''} (recovers ${totalPoints} pts):`
          }
        </div>
        <div className="max-h-40 overflow-y-auto mb-3 flex flex-col gap-0.5">
          {nodes.map(n => (
            <div key={n.id} className="flex items-center gap-2 text-[11px] px-2 py-1 bg-panel rounded">
              <span className="text-text-mute flex-1 truncate">{n.name || n.name_zh || n.id}</span>
              {n.points != null && n.points > 0 && (
                <span className="text-text-dim shrink-0">{n.points}pt</span>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1 text-[11px] border border-hair text-text-mute hover:text-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-3 py-1 text-[11px] font-semibold transition-colors ${
              isSelect
                ? 'bg-green-dim text-text hover:bg-green/30'
                : 'bg-rust-dim text-text hover:bg-rust/30'
            }`}
          >
            {isSelect ? `Select all (${totalPoints} pts)` : `Remove all (+${totalPoints} pts)`}
          </button>
        </div>
      </div>
    </div>
  )
}
