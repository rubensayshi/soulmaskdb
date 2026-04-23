import { useStore } from '../store'

const PRESETS = [1, 5, 10, 25]

export default function QtyControl() {
  const qty = useStore(s => s.quantity)
  const set = useStore(s => s.setQuantity)
  return (
    <div className="flex items-center gap-4 mb-[22px] py-[10px] px-4 bg-bg-2 border border-hair">
      <span className="text-[10px] tracking-[.18em] uppercase text-text-dim font-semibold">Craft Quantity</span>
      <div className="flex items-stretch h-7 border border-hair-strong">
        <button
          className="w-7 bg-panel text-text-mute text-base flex items-center justify-center hover:bg-panel-lift hover:text-green-hi transition-colors"
          onClick={() => set(Math.max(1, qty - 1))}
        >−</button>
        <div className="min-w-[48px] px-3.5 flex items-center justify-center bg-bg text-text text-[13px] font-semibold tabular-nums border-l border-r border-hair-strong">
          ×{qty}
        </div>
        <button
          className="w-7 bg-panel text-text-mute text-base flex items-center justify-center hover:bg-panel-lift hover:text-green-hi transition-colors"
          onClick={() => set(Math.min(99, qty + 1))}
        >+</button>
      </div>
      <div className="flex gap-1 ml-2">
        {PRESETS.map(p => (
          <button
            key={p}
            onClick={() => set(p)}
            className={`px-2.5 py-1 border text-[10px] font-semibold transition-colors ${
              qty === p
                ? 'border-green text-green-hi bg-green-bg'
                : 'border-hair bg-panel text-text-dim hover:border-green-dim hover:text-green-hi'
            }`}
          >×{p}</button>
        ))}
      </div>
      <span className="ml-auto text-[11px] text-text-dim italic">All quantities update live</span>
    </div>
  )
}
