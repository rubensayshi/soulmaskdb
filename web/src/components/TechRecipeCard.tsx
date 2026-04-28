import { Link } from 'react-router-dom'
import type { TechRecipeLink } from '../lib/types'

const ICON_BASE = import.meta.env.VITE_ICON_BASE || '/icons'

function iconUrl(path: string): string {
  const name = path.split('/').pop()
  return `${ICON_BASE}/${name}.webp`
}

export default function TechRecipeCard({ recipe }: { recipe: TechRecipeLink }) {
  const href = `/item/${recipe.item_slug ?? recipe.item_id}`

  return (
    <Link
      to={href}
      className="flex items-center gap-2 rounded border border-neutral-700 bg-white/[0.03] px-2 py-1.5 hover:border-teal-600 hover:bg-white/[0.06] transition-colors"
    >
      {recipe.item_icon ? (
        <img src={iconUrl(recipe.item_icon)} alt="" className="h-7 w-7 rounded object-contain" />
      ) : (
        <div className="h-7 w-7 rounded bg-teal-900/30 flex items-center justify-center text-xs text-teal-400">?</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-neutral-300 truncate">{recipe.item_name || recipe.item_name_zh}</div>
      </div>
      <span className="text-teal-500 text-xs">&rarr;</span>
    </Link>
  )
}
