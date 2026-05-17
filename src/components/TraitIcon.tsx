import { useState } from 'react'
import { getBestTrait } from '../lib/traits'

const BADGE_PATHS = {
  hexagon: 'M27,5 L73,5 L96,50 L73,95 L27,95 L4,50 Z',
  diamond: 'M50,4 L96,50 L50,96 L4,50 Z',
  shield: 'M50,6 L86,22 L86,54 Q86,82 50,95 Q14,82 14,54 L14,22 Z',
}

const BADGE_INNER = {
  hexagon: 'M30,10 L70,10 L90,50 L70,90 L30,90 L10,50 Z',
  diamond: 'M50,10 L90,50 L50,90 L10,50 Z',
  shield: 'M50,11 L81,25 L81,52 Q81,78 50,90 Q19,78 19,52 L19,25 Z',
}

type BadgeShape = 'hexagon' | 'diamond' | 'shield'

function getShape(source: string | undefined): BadgeShape {
  if (source === 'Normal' || !source) return 'hexagon'
  if (source === 'XiHao' || source === 'XingGe') return 'diamond'
  return 'shield'
}

const BADGE_COLORS: Record<BadgeShape, { fill: string; stroke: string }> = {
  hexagon: { fill: '#1e2a1a', stroke: '#4a6a3a' },
  diamond: { fill: '#2e2640', stroke: '#8a70b0' },
  shield: { fill: '#2a2518', stroke: '#8a7a4a' },
}

interface Props {
  iconName: string
  confidence?: number
  size?: number
  showTooltip?: boolean
}

export function TraitIcon({ iconName, confidence, size = 28, showTooltip = true }: Props) {
  const [hover, setHover] = useState(false)
  const [imgErr, setImgErr] = useState(false)
  const trait = getBestTrait(iconName)
  const shape = getShape(trait?.source)
  const colors = BADGE_COLORS[shape]
  const iconSize = Math.ceil(size * 0.65)
  const isLowConf = confidence !== undefined && confidence < 0.8

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0" style={{ width: size, height: size }}>
        <path d={BADGE_PATHS[shape]} fill={colors.stroke} />
        <path d={BADGE_INNER[shape]} fill={colors.fill} />
      </svg>
      {!imgErr && (
        <img
          src={`/icons/${iconName}.webp`}
          alt={trait?.name_zh || iconName}
          className="relative object-contain"
          style={{ width: iconSize, height: iconSize }}
          onError={() => setImgErr(true)}
        />
      )}
      {isLowConf && (
        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-danger rounded-full" />
      )}

      {hover && showTooltip && trait && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-panel border border-green/20 rounded text-xs whitespace-nowrap shadow-lg pointer-events-none">
          <div className="font-medium text-text">{trait.name_zh}</div>
          {trait.description_zh && (
            <div className="text-text-dim mt-0.5 max-w-[200px] whitespace-normal">
              {trait.description_zh}
            </div>
          )}
          {confidence !== undefined && (
            <div className={`mt-1 ${isLowConf ? 'text-danger' : 'text-text-dim'}`}>
              Confidence: {Math.round(confidence * 100)}%
            </div>
          )}
        </div>
      )}
    </div>
  )
}
