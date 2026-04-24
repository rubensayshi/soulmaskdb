export const QUALITY_TIERS = [
  { label: 'Normal',    color: '#9a9a9a' },
  { label: 'Fine',      color: '#5a9e4b' },
  { label: 'Superior',  color: '#4a7ec2' },
  { label: 'Excellent', color: '#9b59b6' },
  { label: 'Epic',      color: '#e67e22' },
  { label: 'Legendary', color: '#e74c3c' },
]

interface Props {
  value: number
  onChange: (q: number) => void
  hasStats: boolean
}

export default function QualitySelector({ value, onChange, hasStats }: Props) {
  if (!hasStats) return null

  return (
    <div className="flex items-center gap-1">
      {QUALITY_TIERS.map((tier, i) => {
        const active = i === value
        return (
          <button
            key={i}
            onClick={() => onChange(i)}
            title={tier.label}
            className="relative w-[22px] h-[22px] flex items-center justify-center transition-all"
            style={{ opacity: active ? 1 : 0.35 }}
          >
            <svg viewBox="0 0 20 20" className="w-[18px] h-[18px]">
              <path
                d="M10 1 L19 10 L10 19 L1 10 Z"
                fill={active ? tier.color : 'none'}
                fillOpacity={active ? 0.3 : 0}
                stroke={tier.color}
                strokeWidth={active ? 2 : 1.2}
              />
              {i > 0 && (
                <path
                  d="M10 6 L14 10 L10 14 L6 10 Z"
                  fill={tier.color}
                  fillOpacity={active ? 0.8 : 0.5}
                  stroke="none"
                />
              )}
            </svg>
          </button>
        )
      })}
    </div>
  )
}
