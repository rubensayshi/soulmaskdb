import type { Item } from '../lib/types'
import { useState } from 'react'

const CDN = 'https://www.soulmaskdatabase.com/images/'

interface Props {
  item: Item | undefined
  size?: number
  variant?: 'default' | 'root' | 'raw' | 'jade'
  onClick?: () => void
}

function initials(s: string): string {
  return s.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function Diamond({ item, size = 42, variant = 'default', onClick }: Props) {
  const [err, setErr] = useState(false)
  if (!item) return null
  const label = item.n ?? item.nz ?? item.id
  const hasImg = item.ic && !err

  const border = {
    default: 'border-border-lit',
    root:    'border-gold border-[1.5px]',
    raw:     'border-raw-border',
    jade:    'border-jade-border',
  }[variant]
  const bg = {
    default: 'bg-card hover:bg-card-hover',
    root:    'bg-card-hover',
    raw:     'bg-raw-bg',
    jade:    'bg-jade-bg',
  }[variant]
  const hover = variant === 'raw' ? '' : 'hover:border-gold'
  const cursor = onClick ? 'cursor-pointer' : ''

  return (
    <div
      className={`diamond border ${border} ${bg} ${hover} ${cursor} transition-colors`}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      <div className="diamond-inner" style={{ width: size, height: size }}>
        {hasImg ? (
          <img
            src={CDN + (item.ic as string)}
            alt={label}
            style={{ width: size * 0.7, height: size * 0.7 }}
            className="object-cover"
            onError={() => setErr(true)}
          />
        ) : (
          <span style={{ fontSize: size * 0.24 }} className="font-semibold text-text-muted">
            {initials(label)}
          </span>
        )}
      </div>
    </div>
  )
}
