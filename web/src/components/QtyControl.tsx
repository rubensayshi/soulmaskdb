import { useStore } from '../store'

export default function QtyControl() {
  const qty = useStore(s => s.quantity)
  const set = useStore(s => s.setQuantity)
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[9px] text-text-dim tracking-wider2 uppercase font-semibold">Quantity</span>
      <div className="flex items-center border border-border overflow-hidden">
        <button
          className="w-7 h-7 flex items-center justify-center text-text-muted hover:bg-card hover:text-gold"
          onClick={() => set(qty - 1)}
        >−</button>
        <div className="px-3 text-sm font-semibold text-text border-l border-r border-border min-w-[38px] text-center leading-7 tabular-nums">
          {qty}
        </div>
        <button
          className="w-7 h-7 flex items-center justify-center text-text-muted hover:bg-card hover:text-gold"
          onClick={() => set(qty + 1)}
        >+</button>
      </div>
    </div>
  )
}
