import type { SeedSource } from '../lib/types'

const SOURCE_TYPE_LABELS: Record<string, string> = {
  grinder: 'Grinder',
  barracks_farm: 'Barracks Farm',
  container: 'Container Loot',
  wild_plant: 'Wild Plant',
  npc: 'NPC Drop',
}

const SOURCE_TYPE_ACCENT: Record<string, string> = {
  grinder: 'text-gold',
  barracks_farm: 'text-green-hi',
  container: 'text-rust',
  wild_plant: 'text-green-hi',
  npc: 'text-rust',
}

const MAP_LABELS: Record<string, string> = {
  base: 'Base Map',
  dlc: 'Shifting Sands (DLC)',
  both: 'Base Map + DLC',
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: 'green' | 'gold' | 'rust' }) {
  const color =
    accent === 'green' ? 'text-green' :
    accent === 'gold'  ? 'text-gold'  :
    accent === 'rust'  ? 'text-rust'  :
    'text-text'
  return (
    <div className="flex items-center gap-[7px] text-[11.5px] text-text-mute">
      <span className="w-[5px] h-[5px] rotate-45 bg-green opacity-80 flex-shrink-0" />
      <span className="text-text-dim uppercase text-[10px] tracking-[.1em] font-medium">{label}</span>
      <span className={`font-medium ${color}`}>{value}</span>
    </div>
  )
}

interface Props {
  seed: SeedSource
}

export function SeedFarmingStats({ seed }: Props) {
  return (
    <div className="flex flex-wrap gap-[18px] px-4 py-3 mb-4 border border-hair bg-panel">
      <Stat label="Map" value={MAP_LABELS[seed.map] ?? seed.map} />
      {seed.fertilizer && <Stat label="Fertilizer" value={seed.fertilizer} accent="gold" />}
      {seed.temp_growth && <Stat label="Growth" value={`${seed.temp_growth}°C`} accent="green" />}
      {seed.temp_optimal && <Stat label="Optimal" value={`${seed.temp_optimal}°C`} accent="green" />}
      {seed.grindable
        ? <Stat label="Grindable" value={seed.grinder_input ? `from ${seed.grinder_input}` : 'Yes'} accent="gold" />
        : <Stat label="Grindable" value="No — loot or harvest only" accent="rust" />
      }
    </div>
  )
}

export default function SeedSources({ seed }: Props) {
  const recommended = seed.sources.find(s => s.recommended)
  const others = seed.sources.filter(s => !s.recommended)

  return (
    <div className="mb-4">

      {/* Recommended source — emphasized */}
      {recommended && (
        <div className="border border-green-dim bg-green-dim/10 mb-3">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-green-dim/40">
            <svg viewBox="0 0 12 12" className="w-3 h-3 text-green-hi flex-shrink-0" fill="currentColor">
              <path d="M6 0L7.5 4.5L12 6L7.5 7.5L6 12L4.5 7.5L0 6L4.5 4.5Z" />
            </svg>
            <span className="text-[10px] tracking-[.1em] uppercase font-medium text-green-hi">
              Best source
            </span>
            <span className="text-[10px] tracking-[.08em] uppercase text-text-dim ml-1">
              {SOURCE_TYPE_LABELS[recommended.type] ?? recommended.type}
            </span>
          </div>
          <div className="px-4 py-3">
            <div className="text-[12px] text-text">{recommended.description}</div>
            {recommended.locations && recommended.locations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {recommended.locations.map((loc, j) => (
                  <span key={j} className="inline-flex items-center gap-1 px-2 py-[2px] text-[10px] tracking-[.03em] bg-green-dim/20 border border-green-dim/40 text-green-hi">
                    <svg viewBox="0 0 8 10" className="w-2 h-2.5 opacity-60" fill="currentColor">
                      <path d="M4 0C1.8 0 0 1.8 0 4c0 3 4 6 4 6s4-3 4-6c0-2.2-1.8-4-4-4zm0 5.5c-.8 0-1.5-.7-1.5-1.5S3.2 2.5 4 2.5 5.5 3.2 5.5 4 4.8 5.5 4 5.5z" />
                    </svg>
                    {loc}
                  </span>
                ))}
              </div>
            )}
            {recommended.notes && (
              <div className="text-[11px] text-text-mute mt-1.5 italic">{recommended.notes}</div>
            )}
          </div>
        </div>
      )}

      {/* Other sources */}
      {others.length > 0 && (
        <div className="border border-hair bg-panel">
          {others.map((s, i) => (
            <div key={i} className={`px-4 py-3 ${i > 0 ? 'border-t border-hair' : ''}`}>
              <div className="flex items-start gap-2.5">
                <span className="w-[5px] h-[5px] rotate-45 bg-green opacity-80 flex-shrink-0 mt-[5px]" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-[10px] tracking-[.1em] uppercase font-medium flex-shrink-0 ${SOURCE_TYPE_ACCENT[s.type] ?? 'text-text-dim'}`}>
                      {SOURCE_TYPE_LABELS[s.type] ?? s.type}
                    </span>
                    <span className="text-[12px] text-text-mute">{s.description}</span>
                  </div>
                  {s.locations && s.locations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {s.locations.map((loc, j) => (
                        <span key={j} className="inline-flex items-center gap-1 px-2 py-[2px] text-[10px] tracking-[.03em] bg-surface border border-hair text-text-dim">
                          <svg viewBox="0 0 8 10" className="w-2 h-2.5 text-rust/60" fill="currentColor">
                            <path d="M4 0C1.8 0 0 1.8 0 4c0 3 4 6 4 6s4-3 4-6c0-2.2-1.8-4-4-4zm0 5.5c-.8 0-1.5-.7-1.5-1.5S3.2 2.5 4 2.5 5.5 3.2 5.5 4 4.8 5.5 4 5.5z" />
                          </svg>
                          {loc}
                        </span>
                      ))}
                    </div>
                  )}
                  {s.notes && (
                    <div className="text-[11px] text-text-mute mt-1.5 italic">{s.notes}</div>
                  )}
                  {s.qty && (
                    <div className="text-[11px] text-text-dim mt-1 tabular-nums">Qty: {s.qty}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
