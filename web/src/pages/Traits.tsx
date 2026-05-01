import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { fetchTraits } from '../lib/api'
import type { Trait } from '../lib/types'

const SOURCE_TABS = [
  { key: 'all',              label: 'All' },
  { key: 'Normal',           label: 'Combat' },
  { key: 'BornBuLuoCiTiao',  label: 'Tribe born' },
  { key: 'BornChuShen',      label: 'Origin' },
  { key: 'ChengHao',         label: 'Title' },
  { key: 'XiHao',            label: 'Preference' },
  { key: 'XingGe',           label: 'Personality' },
  { key: 'JingLi',           label: 'Experience' },
] as const

type SourceKey = typeof SOURCE_TABS[number]['key']

const PROFICIENCY_LABELS: Record<string, string> = {
  DaJian: 'Greatsword', Dao: 'Sword', Mao: 'Spear', Gong: 'Bow',
  DunPai: 'Shield', Chui: 'Hammer', QuanTao: 'Gauntlet', ShuangDao: 'Dual Blade',
  FaMu: 'Logging', CaiKuang: 'Mining', ZhongZhi: 'Planting', CaiShou: 'Gathering',
  BuZhuo: 'Trapping', YangZhi: 'Breeding', TuZai: 'Butchering',
  FangZhi: 'Weaving', ZhiTao: 'Pottery', PaoMu: 'Carpentry', QieShi: 'Masonry',
  JianZhu: 'Construction', RouPi: 'Leatherwork', PouJie: 'Dissecting', RongLian: 'Smelting',
  QiJu: 'Furniture', WuQi: 'Weaponry', JiaZhou: 'Armorsmithing', LianJin: 'Alchemy',
  ZhuBao: 'Jewelry', PengRen: 'Cooking', YanMo: 'Grinding',
}

interface TraitFamily {
  learnedId: string
  name: string
  tiers: Trait[]
  source: string
  isDlc: boolean
}

function starDisplay(star: number): string {
  return '★'.repeat(star) + '☆'.repeat(3 - star)
}

const ATTR_LABELS: Record<string, string> = {
  SpeedRate: 'move speed', AttackSpeed: 'atk speed', Attack: 'attack',
  Defense: 'defense', DamageDec: 'dmg reduction', MaxHealth: 'max HP',
  MaxFuZhong: 'carry weight', MaxFood: 'max food', MaxWater: 'max water',
  Crit: 'crit rate', CritDamageInc: 'crit damage', CritDef: 'crit defense',
  HealthRecover: 'HP regen', TiLiRecover: 'stam regen', MaxTiLi: 'max stamina',
  MaxJingShen: 'max focus', MaxTenacity: 'max tenacity',
  DuDamageDec: 'poison resistance', DuKang: 'poison resist',
  FuKang: 'rot resist', HanKang: 'cold resist', YanKang: 'heat resist',
  DaoJuBaoProbInc: 'tool repair chance',
}

function formatEffect(t: Trait): string {
  if (t.effect === 'AttrInc' && t.effect_attr && t.effect_value != null) {
    const abs = Math.abs(t.effect_value)
    const sign = t.effect_value >= 0 ? '+' : ''
    const val = abs < 1
      ? `${sign}${(t.effect_value * 100).toFixed(1)}%`
      : `${sign}${Number.isInteger(t.effect_value) ? t.effect_value : t.effect_value.toFixed(1)}`
    const label = ATTR_LABELS[t.effect_attr] || t.effect_attr
    return `${val} ${label}`
  }
  return ''
}

export default function Traits() {
  const [traits, setTraits] = useState<Trait[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<SourceKey>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dlcFilter, setDlcFilter] = useState<'all' | 'base' | 'dlc'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchTraits()
      .then(setTraits)
      .finally(() => setLoading(false))
  }, [])

  const families = useMemo(() => {
    const map = new Map<string, TraitFamily>()
    for (const t of traits) {
      const key = (t.learned_id && t.learned_id !== '0') ? t.learned_id : t.id
      if (!map.has(key)) {
        map.set(key, {
          learnedId: key,
          name: t.name_en || t.name_zh || t.id,
          tiers: [],
          source: t.source || 'Normal',
          isDlc: t.is_dlc,
        })
      }
      map.get(key)!.tiers.push(t)
    }
    for (const fam of map.values()) {
      fam.tiers.sort((a, b) => a.star - b.star)
    }
    const arr = Array.from(map.values())
    arr.sort((a, b) => {
      const aMax = Math.max(...a.tiers.map(t => t.star))
      const bMax = Math.max(...b.tiers.map(t => t.star))
      if (aMax !== bMax) return bMax - aMax
      return a.name.localeCompare(b.name, 'zh')
    })
    return arr
  }, [traits])

  const filtered = useMemo(() => {
    let result = families
    if (activeTab !== 'all') {
      result = result.filter(f => f.source === activeTab)
    }
    if (dlcFilter === 'base') {
      result = result.filter(f => !f.isDlc)
    } else if (dlcFilter === 'dlc') {
      result = result.filter(f => f.isDlc)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(f => {
        return f.tiers.some(t =>
          (t.name_en && t.name_en.toLowerCase().includes(q)) ||
          (t.name_zh && t.name_zh.includes(q)) ||
          (t.description_en && t.description_en.toLowerCase().includes(q)) ||
          (t.description_zh && t.description_zh.toLowerCase().includes(q))
        )
      })
    }
    return result
  }, [families, activeTab, dlcFilter, searchQuery])

  if (loading) return <div className="p-8 text-text-dim">Loading traits...</div>

  return (
    <>
      <Helmet>
        <title>Tribesman traits - Soulmask Codex</title>
        <meta name="description" content="Complete reference of all tribesman traits (NaturalGifts) in Soulmask, including combat, tribe-born, DLC, and preference traits." />
      </Helmet>

      <div className="p-2 md:p-6 max-w-5xl">
        <h1 className="text-2xl font-bold mb-1">Tribesman traits</h1>
        <p className="text-text-dim text-sm mb-4">
          {traits.length} traits across {families.length} families
        </p>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-3">
          {SOURCE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                activeTab === tab.key
                  ? 'bg-accent text-white'
                  : 'bg-surface text-text-dim hover:bg-surface-hover'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <input
            type="text"
            placeholder="Search traits..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 rounded bg-surface border border-border text-sm w-56"
          />
          <div className="flex gap-1">
            {(['all', 'base', 'dlc'] as const).map(v => (
              <button
                key={v}
                onClick={() => setDlcFilter(v)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  dlcFilter === v
                    ? 'bg-accent text-white'
                    : 'bg-surface text-text-dim hover:bg-surface-hover'
                }`}
              >
                {v === 'all' ? 'All' : v === 'base' ? 'Base game' : 'DLC'}
              </button>
            ))}
          </div>
          <span className="text-text-dim text-xs">
            {filtered.length} {filtered.length === 1 ? 'trait' : 'traits'}
          </span>
        </div>

        {/* Trait list */}
        <div className="space-y-1">
          {filtered.map(fam => {
            const isExpanded = expandedId === fam.learnedId
            const topTier = fam.tiers[fam.tiers.length - 1]
            const effectStr = formatEffect(topTier)

            return (
              <div
                key={fam.learnedId}
                className="border border-border rounded bg-surface"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : fam.learnedId)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-hover transition-colors"
                >
                  <span className="text-yellow-400 text-xs w-16 shrink-0 font-mono">
                    {starDisplay(topTier.star)}
                  </span>
                  <span className="font-medium text-sm flex-1 min-w-0">
                    {fam.name}
                  </span>
                  {effectStr && (
                    <span className="text-xs text-text-dim shrink-0">{effectStr}</span>
                  )}
                  {fam.isDlc && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 shrink-0">
                      DLC
                    </span>
                  )}
                  <span className="text-text-dim text-xs shrink-0">
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-border">
                    {fam.tiers.map(t => (
                      <div key={t.id} className="mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-yellow-400 text-xs font-mono">
                            {starDisplay(t.star)}
                          </span>
                          <span className="text-xs text-text-dim">ID: {t.id}</span>
                        </div>
                        <p className="text-sm mb-1">{t.description_en || t.description_zh}</p>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-dim">
                          {formatEffect(t) && <span>Effect: {formatEffect(t)}</span>}
                          {t.effect_cooldown != null && t.effect_cooldown > 0 && (
                            <span>CD: {t.effect_cooldown}s</span>
                          )}
                          {t.effect_probability != null && t.effect_probability < 1 && (
                            <span>Prob: {(t.effect_probability * 100).toFixed(0)}%</span>
                          )}
                        </div>

                        {t.proficiencies && t.proficiencies.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {t.proficiencies.map(p => (
                              <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                                {PROFICIENCY_LABELS[p] || p}
                              </span>
                            ))}
                          </div>
                        )}

                        {t.weapons && t.weapons.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {t.weapons.map(w => (
                              <span key={w} className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">
                                {w}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {topTier.conditions && topTier.conditions.length > 0 && (
                      <div className="mt-2 text-xs text-text-dim">
                        <span className="font-medium">Conditions: </span>
                        {topTier.conditions.map(c =>
                          c.replace(/^BP_Gift_/, '').replace(/_C$/, '').replace(/_/g, ' ')
                        ).join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <p className="text-text-dim text-sm mt-8 text-center">No traits match your filters.</p>
        )}
      </div>
    </>
  )
}
