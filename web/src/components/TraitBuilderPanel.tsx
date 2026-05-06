import { useState } from 'react'
import type { Trait } from '../lib/types'
import { SLOT_CATEGORIES, type TraitFamilyLike } from '../lib/traitBuilder'

const ICON_BASE = import.meta.env.VITE_ICON_BASE || '/icons'

const CLAN_META: Record<string, { label: string; color: string }> = {
  claw: { label: 'Claw', color: '#e56666' },
  flint: { label: 'Flint', color: '#7a9db5' },
  fang: { label: 'Fang', color: '#6ea09a' },
  wolf: { label: 'Wolf', color: '#8a8ab5' },
  horn: { label: 'Horn', color: '#b8a060' },
  exile: { label: 'Exile', color: '#a67a52' },
  heretic: { label: 'Heretic', color: '#c47070' },
}

const TIER_META: Record<string, { color: string; bg: string }> = {
  S: { color: '#e74c3c', bg: 'rgba(231,76,60,.12)' },
  A: { color: '#e67e22', bg: 'rgba(230,126,34,.10)' },
  B: { color: '#9b59b6', bg: 'rgba(155,89,182,.10)' },
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

type BadgeStyle = { shape: 'hexagon' | 'diamond' | 'shield'; fill: string; stroke: string; inner: string }

function getBadgeStyle(source: string | undefined, isNegative: boolean): BadgeStyle {
  if (source === 'XiHao') {
    return isNegative
      ? { shape: 'diamond', fill: '#3a2030', stroke: '#9a4050', inner: '#5a2535' }
      : { shape: 'diamond', fill: '#2e2640', stroke: '#8a70b0', inner: '#3e3055' }
  }
  if (source === 'Normal' || !source) {
    return isNegative
      ? { shape: 'hexagon', fill: '#352025', stroke: '#9a4050', inner: '#4a2530' }
      : { shape: 'hexagon', fill: '#1e2a1a', stroke: '#4a6a3a', inner: '#2a3a22' }
  }
  return isNegative
    ? { shape: 'shield', fill: '#352025', stroke: '#9a4050', inner: '#4a2530' }
    : { shape: 'shield', fill: '#2a2518', stroke: '#8a7a4a', inner: '#3a3420' }
}

const BADGE_PATHS: Record<BadgeStyle['shape'], string> = {
  hexagon: 'M27,5 L73,5 L96,50 L73,95 L27,95 L4,50 Z',
  diamond: 'M50,4 L96,50 L50,96 L4,50 Z',
  shield: 'M50,6 L86,22 L86,54 Q86,82 50,95 Q14,82 14,54 L14,22 Z',
}

const BADGE_INNER: Record<BadgeStyle['shape'], string> = {
  hexagon: 'M30,10 L70,10 L90,50 L70,90 L30,90 L10,50 Z',
  diamond: 'M50,10 L90,50 L50,90 L10,50 Z',
  shield: 'M50,11 L81,25 L81,52 Q81,78 50,90 Q19,78 19,52 L19,25 Z',
}

function TraitIcon({ name, size = 22, source, isNegative = false }: {
  name: string | null; size?: number; source?: string; isNegative?: boolean
}) {
  const [err, setErr] = useState(false)
  const badge = getBadgeStyle(source, isNegative)
  const iconSize = Math.ceil(size * 0.8 / 2) * 2

  return (
    <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0" style={{ width: size, height: size }}>
        <path d={BADGE_PATHS[badge.shape]} fill={badge.stroke} />
        <path d={BADGE_INNER[badge.shape]} fill={badge.fill} />
      </svg>
      {name && !err && (
        <img
          src={`${ICON_BASE}/${name}.webp`}
          alt=""
          className="relative object-contain"
          style={{ width: iconSize, height: iconSize }}
          onError={() => setErr(true)}
        />
      )}
    </div>
  )
}

function StarPips({ star, max = 3 }: { star: number; max?: number }) {
  return (
    <span className="flex gap-[2px] items-center">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className="w-[5px] h-[5px] rotate-45 border"
          style={{
            backgroundColor: i < star ? '#b8a060' : 'transparent',
            borderColor: i < star ? '#b8a060' : '#4a5040',
          }}
        />
      ))}
    </span>
  )
}

interface Props {
  selectedIds: string[]
  traitsById: Map<string, Trait>
  familyByTraitId: Map<string, TraitFamilyLike>
  slotFills: Map<string, string[]>
  lockedClan: string | null
  lockedByTraitId: string | null
  collapsed: boolean
  onRemove: (traitId: string) => void
  onClear: () => void
  onShare: () => void
  onToggleCollapse: () => void
}

export default function TraitBuilderPanel({
  selectedIds, traitsById, familyByTraitId, slotFills,
  lockedClan, lockedByTraitId, collapsed,
  onRemove, onClear, onShare, onToggleCollapse,
}: Props) {
  const totalCount = selectedIds.length

  const desktopWidth = collapsed ? 40 : 320

  // --- Collapsed strip (desktop) ---
  if (collapsed) {
    return (
      <>
        {/* Spacer to reserve width in the flex layout */}
        <div className="hidden md:block flex-shrink-0" style={{ width: desktopWidth }} />

        {/* Desktop collapsed strip */}
        <div className="hidden md:flex flex-col items-center fixed right-0 top-[72px] w-10 bg-panel border-l border-hair h-[calc(100vh-72px)] z-30">
          <button
            onClick={onToggleCollapse}
            className="w-full flex flex-col items-center gap-2 py-4 hover:bg-panel-2 transition-colors"
            title="Expand builder panel"
          >
            <svg viewBox="0 0 12 12" className="w-3 h-3 text-text-dim" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 3 L5 6 L8 9" />
            </svg>
            {totalCount > 0 && (
              <span className="text-[12px] font-semibold tabular-nums w-5 h-5 flex items-center justify-center rounded-full bg-green-dim text-green-hi">
                {totalCount}
              </span>
            )}
            <span className="text-[11px] text-text-dim uppercase tracking-wider2 [writing-mode:vertical-lr]">
              Build
            </span>
          </button>
        </div>

        {/* Mobile collapsed pill */}
        <button
          onClick={onToggleCollapse}
          className="md:hidden fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 bg-panel border border-hair rounded-full shadow-lg"
        >
          <span className="text-[13px] text-text-mute font-medium">Build</span>
          {totalCount > 0 && (
            <span className="text-[12px] font-semibold tabular-nums w-5 h-5 flex items-center justify-center rounded-full bg-green-dim text-green-hi">
              {totalCount}
            </span>
          )}
        </button>
      </>
    )
  }

  const lockedByTrait = lockedByTraitId ? traitsById.get(lockedByTraitId) : null

  const panelContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-hair">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleCollapse}
            className="text-text-dim hover:text-text transition-colors p-0.5 -ml-1 hidden md:block"
            title="Collapse panel"
          >
            <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 3 L7 6 L4 9" />
            </svg>
          </button>
          <h2 className="font-heading text-[14px] font-semibold text-text tracking-[.03em]">
            Tribesman build
          </h2>
        </div>
        <button
          onClick={onShare}
          className="px-2 py-0.5 text-[12px] uppercase tracking-wider2 border border-hair text-text-mute hover:text-text hover:border-green-dim transition-colors"
          disabled={totalCount === 0}
          style={totalCount === 0 ? { opacity: 0.4, cursor: 'default' } : undefined}
        >
          Share build
        </button>
      </div>

      {/* Clan indicator */}
      {lockedClan && CLAN_META[lockedClan] && (
        <div
          className="flex items-center gap-2 px-4 py-2 border-b border-hair text-[13px]"
          style={{ backgroundColor: `rgba(${hexToRgb(CLAN_META[lockedClan].color)},.06)` }}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: CLAN_META[lockedClan].color }}
          />
          <span style={{ color: CLAN_META[lockedClan].color }} className="font-semibold">
            {CLAN_META[lockedClan].label} clan
          </span>
          {lockedByTrait && (
            <span className="text-text-dim truncate">
              via {lockedByTrait.name_en || lockedByTrait.name_zh}
            </span>
          )}
        </div>
      )}

      {/* Slot sections */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {SLOT_CATEGORIES.map(cat => {
          const filled = slotFills.get(cat.key) || []
          const emptyCount = Math.max(0, cat.max - filled.length)

          return (
            <div key={cat.key}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] uppercase tracking-wider2 text-text-dim font-medium">
                  {cat.label}
                </span>
                <span className="text-[12px] tabular-nums text-text-dim">
                  {filled.length} / {cat.max}
                </span>
              </div>

              <div className="space-y-1">
                {filled.map(traitId => {
                  const trait = traitsById.get(traitId)
                  if (!trait) return null
                  const fam = familyByTraitId.get(traitId)
                  const tier = fam
                    ? ((fam as any).communityTier || (fam as any).effectiveTier)
                    : null
                  const tierMeta = tier ? TIER_META[tier] : null

                  return (
                    <div
                      key={traitId}
                      className="flex items-center gap-2 px-2 py-0.5 bg-panel-2 border border-hair rounded-sm group"
                    >
                      <TraitIcon name={trait.icon_name} size={26} source={trait.source ?? undefined} isNegative={trait.is_negative} />
                      <StarPips star={trait.star} />
                      <span className="text-[13px] font-display font-semibold tracking-[.02em] text-text truncate flex-1">
                        {trait.name_en || trait.name_zh || trait.id}
                      </span>
                      {tierMeta && (
                        <span
                          className="text-[8px] px-1 py-[1px] uppercase tracking-[.1em] font-bold border flex-shrink-0"
                          style={{ borderColor: `rgba(${hexToRgb(tierMeta.color)},.4)`, color: tierMeta.color, backgroundColor: tierMeta.bg }}
                        >
                          {tier}
                        </span>
                      )}
                      <button
                        onClick={() => onRemove(traitId)}
                        className="text-text-faint hover:text-rust transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                        title="Remove"
                      >
                        <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M3 3 L9 9 M9 3 L3 9" />
                        </svg>
                      </button>
                    </div>
                  )
                })}

                {emptyCount > 0 && (
                  <div className="flex items-center justify-center px-2 py-1.5 border border-dashed border-hair rounded-sm">
                    <span className="text-[12px] text-text-faint italic">
                      {emptyCount === 1 ? 'empty slot' : `${emptyCount} empty slots`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-hair text-[13px]">
        <span className="text-text-mute">
          <span className="font-semibold text-text tabular-nums">{totalCount}</span> trait{totalCount !== 1 ? 's' : ''} selected
        </span>
        {totalCount > 0 && (
          <button
            onClick={onClear}
            className="text-text-dim hover:text-rust transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Spacer to reserve width in the flex layout */}
      <div className="hidden md:block flex-shrink-0" style={{ width: desktopWidth }} />

      {/* Desktop side panel — fixed to right edge */}
      <div className="hidden md:block fixed right-0 top-[72px] w-[320px] bg-panel border-l border-hair h-[calc(100vh-72px)] z-30">
        {panelContent}
      </div>

      {/* Mobile bottom sheet */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-panel border-t border-hair rounded-t-lg shadow-xl max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-center py-2 cursor-pointer" onClick={onToggleCollapse}>
          <div className="w-8 h-1 rounded-full bg-hair-strong" />
        </div>
        {panelContent}
      </div>
    </>
  )
}
