import type { StatEntry } from '../lib/types'

const STAT_NAMES: Record<string, string> = {
  Attack: 'Attack',
  Defense: 'Defense',
  Crit: 'Critical Chance',
  CritDamageInc: 'Critical Damage',
  CritDamageDec: 'Critical Damage Reduction',
  CritDef: 'Critical Defense',
  DamageInc: 'Damage Bonus',
  DamageDec: 'Damage Reduction',
  MaxHealth: 'Max Health',
  HealthRecover: 'Health Regen',
  MaxTiLi: 'Max Stamina',
  TiLiRecover: 'Stamina Regen',
  TiLiWakenJianMian: 'Stamina Reduction',
  MaxTenacity: 'Max Tenacity',
  WeakenTenacityDefense: 'Tenacity Defense',
  MaxFood: 'Max Food',
  MaxWater: 'Max Water',
  MaxFuZhong: 'Max Carry Weight',
  SpeedRate: 'Movement Speed',
  AttackSpeed: 'Attack Speed',
  WuQiDamage: 'Weapon Damage',
  WuQiDamageInc: 'Weapon Damage Bonus',
  WuQiDamageDec: 'Weapon Damage Taken',
  WuQiDamageDecIgnore: 'Armor Penetration',
  WuQiDamageIncAgainstDun: 'Damage vs Shields',
  WuQiDunDamageDec: 'Shield Damage Taken',
  WuQiEventMagnitude: 'Weapon Effect Power',
  BlockWeakenTenacityDefense: 'Block Tenacity',
  BaTi: 'Poise',
  ShengYinRatio: 'Noise Level',
  WenDuBaoNuan: 'Cold Insulation',
  WenDuSanRe: 'Heat Dissipation',
  WenDuAdd: 'Temperature Bonus',
  YinBiValue: 'Stealth',
  HanKang: 'Cold Resistance',
  YanKang: 'Heat Resistance',
  FuKang: 'Corrosion Resistance',
  DuKang: 'Poison Resistance',
  ZhuangBeiFangDu: 'Poison Defense',
  ZhuangBeiFangFuShe: 'Radiation Defense',
  BleedingDamageCarried: 'Bleed Damage',
  BleedingDamageDecRate: 'Bleed Resistance',
  ParalysisDamageCarried: 'Paralysis Damage',
  ParalysisDamageDecRate: 'Paralysis Resistance',
  FallSleepDamageCarried: 'Sleep Damage',
  FallSleepDamageDecRate: 'Sleep Resistance',
  PoisoningDamageDecRate: 'Poisoning Resistance',
  FallDamageDec: 'Fall Damage Reduction',
  HeadMaxHP: 'Head Max HP',
  BodyMaxHP: 'Body Max HP',
  LeftArmMaxHP: 'Left Arm Max HP',
  LeftLegMaxHP: 'Left Leg Max HP',
}

const PERCENTAGE_STATS = new Set([
  'Crit', 'CritDamageInc', 'CritDamageDec', 'CritDef',
  'DamageInc', 'DamageDec', 'WuQiDamageInc', 'WuQiDamageDec',
  'WuQiDamageDecIgnore', 'WuQiDamageIncAgainstDun',
  'AttackSpeed', 'TiLiWakenJianMian', 'WeakenTenacityDefense',
  'BleedingDamageDecRate', 'ParalysisDamageDecRate',
  'FallSleepDamageDecRate', 'PoisoningDamageDecRate',
  'FallDamageDec', 'ZhuangBeiFangDu', 'ZhuangBeiFangFuShe',
  'CritDef', 'ShengYinRatio',
])

function isPercent(attr: string, op?: string | null): boolean {
  return op === 'Multiplicitive' || op === 'Multiplicative' || PERCENTAGE_STATS.has(attr)
}

function fmt(attr: string, value: number, op?: string | null): string {
  if (isPercent(attr, op)) {
    return `${value > 0 ? '+' : ''}${Math.round(value * 100)}%`
  }
  const rounded = Math.round(value * 100) / 100
  return `${rounded > 0 ? '+' : ''}${rounded}`
}

function fmtRange(attr: string, lo: number, hi: number, op?: string | null): string {
  if (isPercent(attr, op)) {
    const loP = Math.round(lo * 100)
    const hiP = Math.round(hi * 100)
    if (loP === hiP) return `${loP > 0 ? '+' : ''}${loP}%`
    return `${loP > 0 ? '+' : ''}${loP}–${hiP}%`
  }
  const loR = Math.round(lo * 100) / 100
  const hiR = Math.round(hi * 100) / 100
  if (loR === hiR) return `${loR > 0 ? '+' : ''}${loR}`
  return `${loR > 0 ? '+' : ''}${loR}–${hiR}`
}

interface MergedStat {
  attr: string
  op: string | null
  valueLo: number
  valueHi: number
}

function mergeStats(stats: StatEntry[], quality: number): MergedStat[] {
  const merged = new Map<string, MergedStat>()
  for (const s of stats) {
    const key = `${s.attr}:${s.op ?? ''}`
    const qlo = s.qlo?.[quality] ?? 1
    const qhi = s.qhi?.[quality] ?? 1
    const vLo = s.value * qlo
    const vHi = s.value * qhi
    const existing = merged.get(key)
    if (existing) {
      existing.valueLo += vLo
      existing.valueHi += vHi
    } else {
      merged.set(key, { attr: s.attr, op: s.op, valueLo: vLo, valueHi: vHi })
    }
  }
  return [...merged.values()]
}

interface Props {
  stats: StatEntry[]
  quality: number
}

export default function ItemStats({ stats, quality }: Props) {
  if (!stats.length) return null
  const rows = mergeStats(stats, quality)

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-0 text-[12px] mb-4">
      {rows.map((s, i) => {
        const isRange = Math.abs(s.valueLo - s.valueHi) > 0.001
        return (
          <div key={i} className="flex items-center justify-between py-[4px] border-b border-hair">
            <span className="text-text-dim">{STAT_NAMES[s.attr] ?? s.attr}</span>
            <span className="font-medium text-text tabular-nums">
              {isRange
                ? fmtRange(s.attr, s.valueLo, s.valueHi, s.op)
                : fmt(s.attr, s.valueLo, s.op)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
