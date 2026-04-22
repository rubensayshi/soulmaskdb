import { useState } from 'react'
import type { Item } from '../lib/types'

const CDN = 'https://www.soulmaskdatabase.com/images/'

function initials(name: string | null | undefined): string {
  if (!name) return '??'
  return name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

interface Props {
  item: Item | undefined
  size?: number
  className?: string
}

export default function Icon({ item, size = 28, className = '' }: Props) {
  const [err, setErr] = useState(false)
  if (!item) return null

  const classes = [
    'flex items-center justify-center overflow-hidden border text-xs font-semibold',
    item.raw
      ? 'bg-raw-bg border-raw-border text-raw'
      : 'bg-card border-border text-text-muted',
    className,
  ].join(' ')

  const style = { width: size, height: size }
  const label = item.n ?? item.nz ?? item.id
  const hasImg = item.ic && !err

  return (
    <div className={classes} style={style}>
      {hasImg ? (
        <img
          src={CDN + (item.ic as string)}
          alt={label}
          className="w-full h-full object-cover"
          onError={() => setErr(true)}
        />
      ) : (
        initials(label)
      )}
    </div>
  )
}
