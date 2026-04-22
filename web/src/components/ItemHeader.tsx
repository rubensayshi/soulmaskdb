import type { Item, Recipe, Station } from '../lib/types'
import Diamond from './Diamond'

interface Props {
  item: Item
  recipe?: Recipe
  station?: Station
}

export default function ItemHeader({ item, recipe, station }: Props) {
  const title = item.n ?? item.nz ?? item.id
  const subtitle = item.raw ? 'Raw Material' : (station?.n ?? 'Crafted Item')
  return (
    <div className="flex items-start gap-4 p-5 mb-5 bg-panel border border-border-lit border-t-[2px] border-t-gold-dim">
      <div className="flex-shrink-0 flex flex-col items-center gap-2">
        <Diamond item={item} size={58} variant={item.ic ? 'root' : 'default'} />
      </div>
      <div className="flex-1">
        <div className="font-display text-lg font-semibold text-text mb-1 tracking-wide">{title}</div>
        <div className="text-[10px] text-text-muted tracking-wider2 uppercase mb-2">{subtitle}</div>
        <div className="flex flex-wrap gap-1">
          {item.raw && (
            <span className="inline-flex items-center gap-1 px-2 py-[3px] text-[10px] font-medium border border-raw-border text-raw bg-raw-bg">
              Gathered
            </span>
          )}
          {station?.n && (
            <span className="inline-flex items-center gap-1 px-2 py-[3px] text-[10px] font-medium border border-gold-dim text-gold bg-card">
              {station.n}
            </span>
          )}
          {recipe?.t != null && (
            <span className="inline-flex items-center gap-1 px-2 py-[3px] text-[10px] font-medium border border-border text-text-muted bg-card">
              ⏱ {recipe.t}s
            </span>
          )}
          {recipe?.prof && (
            <span className="inline-flex items-center gap-1 px-2 py-[3px] text-[10px] font-medium border border-border text-text-muted bg-card">
              {recipe.prof}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
