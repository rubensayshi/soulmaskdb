# Training planner implementation plan

**Goal:** Add a training planner screen to the desktop app that helps players pick optimal mentors for trait training.

**Architecture:** New top-level screen (`planner`) with local React state. Reads roster from existing `MOCK_ROSTER`. Pure functions in `planner.ts` compute the trait pool and rank mentors. Two switchable layouts (three-column planner, two-panel stepper) share the same state.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, existing component library (TraitBadge, Icons, Chip pattern from FilterBar).

---

### Task 1: Types and pure logic

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/planner.ts`

- [ ] **Step 1: Add planner types to `src/lib/types.ts`**

Append after the `SortState` interface:

```typescript
export type SlotType = 'keep' | 'replace' | 'empty' | 'planned'
export type PlannerLayout = 'planner' | 'stepper'

export interface SlotState {
  type: SlotType
  originalTrait?: TraitMatch
  desiredTraitId?: string
}
```

- [ ] **Step 2: Create `src/lib/planner.ts` with `buildSlots`**

```typescript
import type { Tribesman, TraitMatch, SlotState } from './types'

const MAX_SLOTS = 6

export function buildSlots(trainee: Tribesman): SlotState[] {
  const hexTraits = trainee.traits.filter(t => t.shape === 'hexagon')
  const slots: SlotState[] = hexTraits.slice(0, MAX_SLOTS).map(t => ({
    type: 'keep' as const,
    originalTrait: t,
  }))
  while (slots.length < MAX_SLOTS) {
    slots.push({ type: 'empty' as const })
  }
  return slots
}
```

- [ ] **Step 3: Add `buildTraitPool` to `src/lib/planner.ts`**

```typescript
export interface PoolTrait {
  id: string
  name: string
  icon_name: string
  eff: string
  star: number
  mentorCount: number
}

export function buildTraitPool(
  roster: Tribesman[],
  traineeClan: string,
  keptTraitIds: Set<string>,
  clanExclusiveIds?: Map<string, string>,
): PoolTrait[] {
  const mentors = roster.filter(tm => tm.level >= 50)
  const pool = new Map<string, PoolTrait>()

  for (const mentor of mentors) {
    for (const t of mentor.traits) {
      if (t.shape !== 'hexagon') continue
      if (keptTraitIds.has(t.id)) continue
      if (clanExclusiveIds) {
        const requiredClan = clanExclusiveIds.get(t.id)
        if (requiredClan && requiredClan !== traineeClan) continue
      }
      const existing = pool.get(t.id)
      if (existing) {
        existing.mentorCount++
        if (t.star > existing.star) {
          existing.star = t.star
          existing.name = t.name
          existing.eff = t.eff
          existing.icon_name = t.icon_name
        }
      } else {
        pool.set(t.id, {
          id: t.id,
          name: t.name,
          icon_name: t.icon_name,
          eff: t.eff,
          star: t.star,
          mentorCount: 1,
        })
      }
    }
  }

  return Array.from(pool.values()).sort((a, b) => a.name.localeCompare(b.name))
}
```

- [ ] **Step 4: Add `rankMentors` to `src/lib/planner.ts`**

```typescript
export interface RankedMentor {
  tribesman: Tribesman
  desiredTraits: TraitMatch[]
  totalNormal: number
  score: number
}

export function rankMentors(
  roster: Tribesman[],
  desiredTraitIds: Set<string>,
): RankedMentor[] {
  const results: RankedMentor[] = []

  for (const tm of roster) {
    if (tm.level < 50) continue
    const normalTraits = tm.traits.filter(t => t.shape === 'hexagon')
    if (normalTraits.length === 0) continue
    const desired = normalTraits.filter(t => desiredTraitIds.has(t.id))
    if (desired.length === 0) continue
    results.push({
      tribesman: tm,
      desiredTraits: desired,
      totalNormal: normalTraits.length,
      score: desired.length / normalTraits.length,
    })
  }

  return results.sort((a, b) => b.score - a.score || b.desiredTraits.length - a.desiredTraits.length)
}
```

- [ ] **Step 5: Verify typecheck passes**

Run: `pnpm --dir . typecheck`
Expected: no errors (new code is not imported yet, but types must compile)

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/planner.ts
git commit -m "feat: add planner types and pure logic (buildSlots, buildTraitPool, rankMentors)"
```

---

### Task 2: TraitSlot component

**Files:**
- Create: `src/components/TraitSlot.tsx`

- [ ] **Step 1: Create `src/components/TraitSlot.tsx`**

```tsx
import type { SlotState, TraitMatch } from '../lib/types'
import { TraitBadge } from './TraitBadge'

interface Props {
  slot: SlotState
  index: number
  active: boolean
  useForgetfulness: boolean
  onToggleKeep: () => void
  onClick: () => void
  onClear: () => void
  traitLookup: Map<string, TraitMatch>
}

const SLOT_LEVELS = [10, 20, 30, 40, 50, 60]

export function TraitSlot({ slot, index, active, useForgetfulness, onToggleKeep, onClick, onClear, traitLookup }: Props) {
  if (slot.type === 'keep') {
    return (
      <div
        className="flex items-center gap-2 rounded-[var(--radius)]"
        style={{
          padding: '6px 8px',
          background: 'oklch(0.80 0.06 140 / 0.06)',
          border: '1px solid oklch(0.80 0.06 140 / 0.15)',
          cursor: useForgetfulness ? 'pointer' : 'default',
        }}
        onClick={useForgetfulness ? onToggleKeep : undefined}
      >
        <TraitBadge trait={slot.originalTrait!} size={20} withPips={false} />
        <div className="flex-1 min-w-0">
          <div className="truncate" style={{ fontSize: 12 }}>{slot.originalTrait!.name}</div>
          <Stars star={slot.originalTrait!.star} />
        </div>
        <span style={{ fontSize: 10, color: 'var(--color-accent)' }}>KEEP</span>
      </div>
    )
  }

  if (slot.type === 'replace') {
    return (
      <div
        className="flex items-center gap-2 rounded-[var(--radius)] cursor-pointer"
        style={{
          padding: '6px 8px',
          background: 'oklch(0.65 0.15 20 / 0.06)',
          border: '1px solid oklch(0.65 0.15 20 / 0.15)',
        }}
        onClick={onToggleKeep}
      >
        <TraitBadge trait={slot.originalTrait!} size={20} withPips={false} />
        <div className="flex-1 min-w-0">
          <div className="truncate" style={{ fontSize: 12, textDecoration: 'line-through', opacity: 0.5 }}>{slot.originalTrait!.name}</div>
        </div>
        <span style={{ fontSize: 10, color: 'oklch(0.65 0.15 20)' }}>REPLACE</span>
      </div>
    )
  }

  if (slot.type === 'planned') {
    const desired = traitLookup.get(slot.desiredTraitId!)
    return (
      <div
        className="flex items-center gap-2 rounded-[var(--radius)] cursor-pointer"
        style={{
          padding: '6px 8px',
          background: active ? 'oklch(0.55 0.08 165 / 0.12)' : 'oklch(0.55 0.08 165 / 0.06)',
          border: active ? '2px solid oklch(0.55 0.08 165 / 0.4)' : '1px dashed oklch(0.55 0.08 165 / 0.3)',
        }}
        onClick={onClick}
      >
        {desired && <TraitBadge trait={desired} size={20} withPips={false} />}
        <div className="flex-1 min-w-0">
          <div className="truncate" style={{ fontSize: 12, color: 'var(--color-accent)' }}>
            {desired?.name ?? slot.desiredTraitId}
          </div>
          {desired && <Stars star={desired.star} />}
        </div>
        <button
          className="grid place-items-center"
          style={{ width: 16, height: 16, color: 'var(--color-muted)', fontSize: 12 }}
          onClick={e => { e.stopPropagation(); onClear() }}
        >
          ×
        </button>
      </div>
    )
  }

  // empty
  return (
    <div
      className="flex items-center gap-2 rounded-[var(--radius)] cursor-pointer"
      style={{
        padding: '6px 8px',
        border: active ? '2px solid oklch(0.55 0.08 165 / 0.3)' : '1px dashed oklch(0.92 0.018 95 / 0.1)',
        background: active ? 'oklch(0.55 0.08 165 / 0.04)' : undefined,
      }}
      onClick={onClick}
    >
      <svg width={20} height={20} viewBox="0 0 24 24">
        <path d="M12,1.5 L22,6.5 L22,17.5 L12,22.5 L2,17.5 L2,6.5 Z" fill="none" stroke="oklch(0.92 0.018 95 / 0.12)" strokeWidth="1.5" strokeDasharray="3,2" />
      </svg>
      <span style={{ fontSize: 12, opacity: 0.3 }}>
        Slot {index + 1} · unlocks Lv.{SLOT_LEVELS[index]}
      </span>
    </div>
  )
}

function Stars({ star }: { star: number }) {
  return (
    <span className="flex gap-[1.5px]">
      {[1, 2, 3].map(s => (
        <span
          key={s}
          className="rounded-full"
          style={{
            width: 3, height: 3,
            background: s <= star ? 'var(--color-gold)' : 'var(--color-faint)',
          }}
        />
      ))}
    </span>
  )
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --dir . typecheck`
Expected: passes (component is not imported yet but must compile)

- [ ] **Step 3: Commit**

```bash
git add src/components/TraitSlot.tsx
git commit -m "feat: add TraitSlot component with keep/replace/empty/planned states"
```

---

### Task 3: TraineePanel component

**Files:**
- Create: `src/components/TraineePanel.tsx`

- [ ] **Step 1: Create `src/components/TraineePanel.tsx`**

```tsx
import type { Tribesman, SlotState, TraitMatch } from '../lib/types'
import { CLANS } from '../lib/data'
import { TraitSlot } from './TraitSlot'
import { IcoChevDown } from './Icons'

interface Props {
  roster: Tribesman[]
  traineeId: string | null
  onSelectTrainee: (id: string) => void
  slots: SlotState[]
  activeSlotIdx: number | null
  onSlotClick: (idx: number) => void
  onToggleKeep: (idx: number) => void
  onClearSlot: (idx: number) => void
  useForgetfulness: boolean
  onToggleForgetfulness: () => void
  traitLookup: Map<string, TraitMatch>
}

export function TraineePanel({
  roster, traineeId, onSelectTrainee, slots, activeSlotIdx,
  onSlotClick, onToggleKeep, onClearSlot, useForgetfulness,
  onToggleForgetfulness, traitLookup,
}: Props) {
  const trainee = roster.find(tm => tm.id === traineeId)
  const [dropOpen, setDropOpen] = useState(false)

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto content-scroll" style={{ padding: 16 }}>
      {/* Label */}
      <span
        className="uppercase"
        style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)', letterSpacing: '0.1em' }}
      >
        Trainee
      </span>

      {/* Dropdown */}
      <div className="relative">
        <button
          className="flex items-center justify-between w-full rounded-[var(--radius)]"
          style={{
            padding: '8px 10px',
            background: 'oklch(0.19 0.008 130)',
            border: '1px solid var(--color-border)',
            fontSize: 13,
          }}
          onClick={() => setDropOpen(!dropOpen)}
        >
          <span className="truncate">
            {trainee ? trainee.name : 'Select a tribesman...'}
          </span>
          <IcoChevDown size={12} />
        </button>
        {dropOpen && (
          <div
            className="absolute left-0 right-0 rounded-[var(--radius)] overflow-y-auto content-scroll"
            style={{
              top: '100%',
              marginTop: 4,
              maxHeight: 240,
              background: 'oklch(0.19 0.008 130)',
              border: '1px solid var(--color-border)',
              zIndex: 50,
            }}
          >
            {roster.map(tm => (
              <button
                key={tm.id}
                className="flex items-center gap-2 w-full text-left hover:bg-bg-hover"
                style={{
                  padding: '8px 10px',
                  fontSize: 12,
                  background: tm.id === traineeId ? 'var(--color-accent-glow)' : undefined,
                }}
                onClick={() => { onSelectTrainee(tm.id); setDropOpen(false) }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CLANS[tm.clan].hue }} />
                <span className="truncate flex-1">{tm.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)' }}>
                  Lv.{tm.level} · {tm.clan}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Trainee info */}
      {trainee && (
        <div style={{ fontSize: 11, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
          Lv.{trainee.level} · {trainee.clan} · {trainee.klass}
        </div>
      )}

      {/* Forgetfulness toggle */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        style={{ fontSize: 12 }}
        onClick={onToggleForgetfulness}
      >
        <div
          className="rounded-full transition-colors"
          style={{
            width: 32, height: 16,
            background: useForgetfulness ? 'var(--color-accent)' : 'var(--color-border-strong)',
            position: 'relative',
          }}
        >
          <div
            className="rounded-full transition-all"
            style={{
              width: 12, height: 12,
              background: 'white',
              position: 'absolute',
              top: 2,
              left: useForgetfulness ? 18 : 2,
            }}
          />
        </div>
        <span style={{ color: 'var(--color-text-dim)' }}>Forgetfulness potion</span>
      </div>

      {/* Slots label */}
      <span
        className="uppercase"
        style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)', letterSpacing: '0.1em', marginTop: 4 }}
      >
        Trait slots
      </span>

      {/* Slot list */}
      {trainee ? (
        <div className="flex flex-col gap-1.5">
          {slots.map((slot, i) => (
            <TraitSlot
              key={i}
              slot={slot}
              index={i}
              active={activeSlotIdx === i}
              useForgetfulness={useForgetfulness}
              onToggleKeep={() => onToggleKeep(i)}
              onClick={() => onSlotClick(i)}
              onClear={() => onClearSlot(i)}
              traitLookup={traitLookup}
            />
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--color-faint)', fontStyle: 'italic', padding: '20px 0' }}>
          Select a tribesman to plan their training.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add missing `useState` import**

The component uses `useState` for `dropOpen`. Add to the top of the file:

```tsx
import { useState } from 'react'
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm --dir . typecheck`
Expected: passes

- [ ] **Step 4: Commit**

```bash
git add src/components/TraineePanel.tsx
git commit -m "feat: add TraineePanel with dropdown, forgetfulness toggle, and slot list"
```

---

### Task 4: TraitPicker component

**Files:**
- Create: `src/components/TraitPicker.tsx`

- [ ] **Step 1: Create `src/components/TraitPicker.tsx`**

```tsx
import { useMemo } from 'react'
import type { PoolTrait } from '../lib/planner'
import { IcoSearch } from './Icons'

interface Props {
  pool: PoolTrait[]
  search: string
  onSearchChange: (s: string) => void
  selectedIds: Set<string>
  onSelect: (id: string) => void
  activeSlotIdx: number | null
}

export function TraitPicker({ pool, search, onSearchChange, selectedIds, onSelect, activeSlotIdx }: Props) {
  const filtered = useMemo(() => {
    if (!search) return pool
    const q = search.toLowerCase()
    return pool.filter(t => t.name.toLowerCase().includes(q) || t.eff.toLowerCase().includes(q))
  }, [pool, search])

  const canPick = activeSlotIdx !== null

  return (
    <div className="flex flex-col gap-3 h-full" style={{ padding: 16 }}>
      <span
        className="uppercase"
        style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)', letterSpacing: '0.1em' }}
      >
        Available traits{' '}
        <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: '0.02em' }}>
          (from your roster's Lv.50+ mentors)
        </span>
      </span>

      {/* Search */}
      <div
        className="flex items-center rounded-[var(--radius)]"
        style={{
          height: 30,
          background: 'oklch(0.18 0.008 130)',
          border: '1px solid var(--color-border-soft)',
          padding: '0 10px',
        }}
      >
        <IcoSearch />
        <input
          className="flex-1 bg-transparent border-0 outline-0 px-2"
          style={{ color: 'var(--color-text)', fontSize: 12, fontStyle: 'italic' }}
          placeholder="Search by name or effect..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto content-scroll flex flex-col gap-1">
        {filtered.length === 0 && (
          <div style={{ padding: '20px 0', color: 'var(--color-faint)', fontSize: 12, fontStyle: 'italic', textAlign: 'center' }}>
            {pool.length === 0
              ? 'No eligible mentors in roster (Lv.50+ required)'
              : 'No traits match your search.'}
          </div>
        )}
        {filtered.map(t => {
          const isSelected = selectedIds.has(t.id)
          return (
            <button
              key={t.id}
              className="flex items-center gap-2 rounded-[var(--radius)] text-left transition-colors"
              style={{
                padding: '8px 10px',
                background: isSelected ? 'oklch(0.55 0.08 165 / 0.08)' : 'oklch(0.19 0.008 130 / 0.4)',
                border: isSelected ? '1px solid oklch(0.55 0.08 165 / 0.25)' : '1px solid transparent',
                opacity: !canPick && !isSelected ? 0.5 : 1,
                cursor: canPick ? 'pointer' : 'default',
              }}
              onClick={() => canPick && onSelect(t.id)}
              disabled={!canPick && !isSelected}
            >
              <svg width={20} height={20} viewBox="0 0 24 24">
                <path
                  d="M12,1.5 L22,6.5 L22,17.5 L12,22.5 L2,17.5 L2,6.5 Z"
                  fill={isSelected ? 'oklch(0.20 0.02 165)' : 'oklch(0.20 0.02 165 / 0.5)'}
                  stroke={isSelected ? 'oklch(0.80 0.06 140)' : 'oklch(0.55 0.08 165)'}
                  strokeWidth="1"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate" style={{ fontSize: 13, color: isSelected ? 'var(--color-accent)' : undefined }}>
                    {t.name}
                  </span>
                  <Stars star={t.star} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 1 }}>{t.eff}</div>
              </div>
              <span style={{ fontSize: 11, color: isSelected ? 'var(--color-accent)' : 'var(--color-faint)', whiteSpace: 'nowrap' }}>
                {isSelected ? '✓ selected' : `${t.mentorCount} mentor${t.mentorCount !== 1 ? 's' : ''}`}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Stars({ star }: { star: number }) {
  return (
    <span className="inline-flex gap-[1.5px]" style={{ marginTop: 1 }}>
      {[1, 2, 3].map(s => (
        <span
          key={s}
          className="rounded-full"
          style={{ width: 3, height: 3, background: s <= star ? 'var(--color-gold)' : 'var(--color-faint)' }}
        />
      ))}
    </span>
  )
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --dir . typecheck`
Expected: passes

- [ ] **Step 3: Commit**

```bash
git add src/components/TraitPicker.tsx
git commit -m "feat: add TraitPicker with search and roster-scoped trait pool"
```

---

### Task 5: MentorCard and MentorPanel components

**Files:**
- Create: `src/components/MentorCard.tsx`
- Create: `src/components/MentorPanel.tsx`

- [ ] **Step 1: Create `src/components/MentorCard.tsx`**

```tsx
import type { RankedMentor } from '../lib/planner'
import { CLANS } from '../lib/data'
import { TraitBadge } from './TraitBadge'

interface Props {
  mentor: RankedMentor
  allDesiredIds: Set<string>
}

export function MentorCard({ mentor, allDesiredIds }: Props) {
  const { tribesman: tm, desiredTraits, totalNormal, score } = mentor
  const pct = Math.round(score * 100)
  const isHighOdds = pct >= 50

  return (
    <div
      className="rounded-[var(--radius)]"
      style={{
        padding: '10px 12px',
        background: isHighOdds ? 'oklch(0.80 0.06 140 / 0.04)' : 'oklch(0.19 0.008 130 / 0.4)',
        border: `1px solid ${isHighOdds ? 'oklch(0.80 0.06 140 / 0.12)' : 'var(--color-border-soft)'}`,
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-serif)' }}>
          {tm.name}
        </span>
        <span style={{ fontSize: 20, fontWeight: 700, color: isHighOdds ? 'var(--color-accent)' : 'var(--color-text-dim)' }}>
          {pct}%
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', marginBottom: 8 }}>
        Lv.{tm.level} · {tm.clan}
      </div>

      {/* Desired trait chips */}
      <div className="flex flex-wrap gap-1">
        {desiredTraits.map(t => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 rounded-full"
            style={{
              padding: '1px 6px',
              fontSize: 11,
              background: 'oklch(0.80 0.06 140 / 0.12)',
              color: 'var(--color-accent)',
            }}
          >
            {t.name}
          </span>
        ))}
        {totalNormal - desiredTraits.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--color-faint)', padding: '1px 4px' }}>
            +{totalNormal - desiredTraits.length} other{totalNormal - desiredTraits.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Summary */}
      <div style={{ fontSize: 10, color: 'var(--color-faint)', marginTop: 6, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
        {totalNormal} traits · {desiredTraits.length} desired
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/MentorPanel.tsx`**

```tsx
import { useMemo } from 'react'
import type { Tribesman } from '../lib/types'
import { rankMentors } from '../lib/planner'
import { MentorCard } from './MentorCard'

interface Props {
  roster: Tribesman[]
  desiredTraitIds: Set<string>
  focusTraitId: string | null
  traineeId: string | null
}

export function MentorPanel({ roster, desiredTraitIds, focusTraitId, traineeId }: Props) {
  const candidates = useMemo(
    () => roster.filter(tm => tm.id !== traineeId),
    [roster, traineeId],
  )

  const ranked = useMemo(
    () => rankMentors(candidates, desiredTraitIds),
    [candidates, desiredTraitIds],
  )

  const focusName = focusTraitId
    ? candidates.flatMap(tm => tm.traits).find(t => t.id === focusTraitId)?.name
    : null

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto content-scroll" style={{ padding: 16 }}>
      <span
        className="uppercase"
        style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)', letterSpacing: '0.1em' }}
      >
        Best mentors
      </span>
      {focusName && (
        <div style={{ fontSize: 11, color: 'var(--color-faint)', marginTop: -8 }}>
          Showing mentors with: {focusName}
        </div>
      )}

      {desiredTraitIds.size === 0 && (
        <div style={{ fontSize: 12, color: 'var(--color-faint)', fontStyle: 'italic', padding: '20px 0', textAlign: 'center' }}>
          Pick desired traits to see mentor recommendations.
        </div>
      )}

      {desiredTraitIds.size > 0 && ranked.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--color-faint)', fontStyle: 'italic', padding: '20px 0', textAlign: 'center' }}>
          No Lv.50+ roster members have these traits.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {ranked.map(m => (
          <MentorCard key={m.tribesman.id} mentor={m} allDesiredIds={desiredTraitIds} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm --dir . typecheck`
Expected: passes

- [ ] **Step 4: Commit**

```bash
git add src/components/MentorCard.tsx src/components/MentorPanel.tsx
git commit -m "feat: add MentorCard and MentorPanel with odds-based ranking"
```

---

### Task 6: IcoTarget icon

**Files:**
- Modify: `src/components/Icons.tsx`

- [ ] **Step 1: Add IcoTarget to `src/components/Icons.tsx`**

Append before the closing of the file:

```tsx
export function IcoTarget({ size = 18 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
      <line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" />
      <line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" />
    </svg>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Icons.tsx
git commit -m "feat: add IcoTarget icon for training planner nav"
```

---

### Task 7: TrainingPlanner page — layout A (three-column)

**Files:**
- Create: `src/pages/TrainingPlanner.tsx`

- [ ] **Step 1: Create `src/pages/TrainingPlanner.tsx`**

```tsx
import { useState, useMemo, useCallback } from 'react'
import type { Tribesman, SlotState, TraitMatch, PlannerLayout } from '../lib/types'
import { buildSlots, buildTraitPool, rankMentors } from '../lib/planner'
import { MOCK_ROSTER } from '../lib/data'
import { TraineePanel } from '../components/TraineePanel'
import { TraitPicker } from '../components/TraitPicker'
import { MentorPanel } from '../components/MentorPanel'

export function TrainingPlanner() {
  const roster = MOCK_ROSTER

  const [traineeId, setTraineeId] = useState<string | null>(null)
  const [slots, setSlots] = useState<SlotState[]>(Array.from({ length: 6 }, () => ({ type: 'empty' as const })))
  const [useForgetfulness, setUseForgetfulness] = useState(false)
  const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null)
  const [traitSearch, setTraitSearch] = useState('')

  const trainee = roster.find(tm => tm.id === traineeId) ?? null

  const handleSelectTrainee = useCallback((id: string) => {
    setTraineeId(id)
    const tm = roster.find(t => t.id === id)
    if (tm) {
      setSlots(buildSlots(tm))
      setActiveSlotIdx(null)
      setTraitSearch('')
    }
  }, [roster])

  const handleToggleKeep = useCallback((idx: number) => {
    setSlots(prev => prev.map((s, i) => {
      if (i !== idx) return s
      if (s.type === 'keep') return { ...s, type: 'replace' as const }
      if (s.type === 'replace') return { ...s, type: 'keep' as const }
      return s
    }))
  }, [])

  const handleSlotClick = useCallback((idx: number) => {
    const slot = slots[idx]
    if (slot.type === 'empty' || slot.type === 'planned' || slot.type === 'replace') {
      setActiveSlotIdx(idx)
    }
  }, [slots])

  const handleClearSlot = useCallback((idx: number) => {
    setSlots(prev => prev.map((s, i) => {
      if (i !== idx) return s
      if (s.originalTrait) return { type: 'replace' as const, originalTrait: s.originalTrait }
      return { type: 'empty' as const }
    }))
    setActiveSlotIdx(null)
  }, [])

  const handleToggleForgetfulness = useCallback(() => {
    setUseForgetfulness(prev => {
      if (prev) {
        setSlots(s => s.map(slot =>
          slot.type === 'replace' ? { ...slot, type: 'keep' as const } : slot
        ))
      }
      return !prev
    })
  }, [])

  const keptTraitIds = useMemo(
    () => new Set(slots.filter(s => s.type === 'keep' && s.originalTrait).map(s => s.originalTrait!.id)),
    [slots],
  )

  const desiredTraitIds = useMemo(
    () => new Set(slots.filter(s => s.type === 'planned' && s.desiredTraitId).map(s => s.desiredTraitId!)),
    [slots],
  )

  const pool = useMemo(
    () => buildTraitPool(roster, trainee?.clan ?? '', keptTraitIds),
    [roster, trainee?.clan, keptTraitIds],
  )

  const traitLookup = useMemo(() => {
    const map = new Map<string, TraitMatch>()
    for (const tm of roster) {
      for (const t of tm.traits) {
        if (!map.has(t.id) || t.star > map.get(t.id)!.star) map.set(t.id, t)
      }
    }
    return map
  }, [roster])

  const handleSelectTrait = useCallback((traitId: string) => {
    if (activeSlotIdx === null) return
    setSlots(prev => prev.map((s, i) => {
      if (i !== activeSlotIdx) return s
      return { ...s, type: 'planned' as const, desiredTraitId: traitId }
    }))
    setActiveSlotIdx(null)
    setTraitSearch('')
  }, [activeSlotIdx])

  const focusTraitId = activeSlotIdx !== null && slots[activeSlotIdx]?.type === 'planned'
    ? slots[activeSlotIdx].desiredTraitId ?? null
    : null

  return (
    <div className="grid h-full min-h-0" style={{ gridTemplateColumns: '240px 1fr 280px' }}>
      <div className="border-r border-border-soft overflow-hidden" style={{ background: 'oklch(0.155 0.006 130)' }}>
        <TraineePanel
          roster={roster}
          traineeId={traineeId}
          onSelectTrainee={handleSelectTrainee}
          slots={slots}
          activeSlotIdx={activeSlotIdx}
          onSlotClick={handleSlotClick}
          onToggleKeep={handleToggleKeep}
          onClearSlot={handleClearSlot}
          useForgetfulness={useForgetfulness}
          onToggleForgetfulness={handleToggleForgetfulness}
          traitLookup={traitLookup}
        />
      </div>
      <div className="border-r border-border-soft overflow-hidden">
        <TraitPicker
          pool={pool}
          search={traitSearch}
          onSearchChange={setTraitSearch}
          selectedIds={desiredTraitIds}
          onSelect={handleSelectTrait}
          activeSlotIdx={activeSlotIdx}
        />
      </div>
      <div className="overflow-hidden">
        <MentorPanel
          roster={roster}
          desiredTraitIds={desiredTraitIds}
          focusTraitId={focusTraitId}
          traineeId={traineeId}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --dir . typecheck`
Expected: passes

- [ ] **Step 3: Commit**

```bash
git add src/pages/TrainingPlanner.tsx
git commit -m "feat: add TrainingPlanner page with three-column layout"
```

---

### Task 8: Wire into App.tsx and nav rail

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add imports to `src/App.tsx`**

Add at the top with the other imports:

```typescript
import { TrainingPlanner } from './pages/TrainingPlanner'
import { IcoTarget } from './components/Icons'
```

- [ ] **Step 2: Update screen type**

Change the `screen` state line from:

```typescript
const [screen, setScreen] = useState<'roster' | 'empty' | 'review'>('roster')
```

to:

```typescript
const [screen, setScreen] = useState<'roster' | 'empty' | 'review' | 'planner'>('roster')
```

- [ ] **Step 3: Add nav rail button**

After the Roster `RailBtn` (line ~94) and before the Capture `RailBtn`, add:

```tsx
          <RailBtn active={screen === 'planner'} onClick={() => setScreen('planner')} title="Training planner">
            <IcoTarget />
          </RailBtn>
```

- [ ] **Step 4: Add top bar for planner screen**

After the roster top bar block (the `{screen === 'roster' && <div ...>` block ending at line ~194), add:

```tsx
          {screen === 'planner' && <div
            className="flex items-center gap-4 shrink-0"
            style={{
              height: 56,
              padding: '0 22px',
              borderBottom: '1px solid var(--color-border-soft)',
              background: 'oklch(0.165 0.006 130 / 0.7)',
            }}
          >
            <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 22, margin: 0, letterSpacing: '0.01em' }}>
              Training <em style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--color-accent)', marginLeft: 2 }}>Planner</em>
            </h1>
          </div>}
```

- [ ] **Step 5: Add planner content render**

In the content area (inside `<div className="flex-1 min-h-0 overflow-auto content-scroll">`), add after the split layout block:

```tsx
            {screen === 'planner' && (
              <TrainingPlanner />
            )}
```

- [ ] **Step 6: Verify typecheck**

Run: `pnpm --dir . typecheck`
Expected: passes

- [ ] **Step 7: Verify in browser**

Open http://localhost:1803 (or the worktree port). Click the target icon in the left rail. The Training Planner screen should render with three columns. Select a trainee, confirm slots appear, pick traits, see mentors.

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire training planner into app nav and screen routing"
```

---

### Task 9: Stepper layout (layout B)

**Files:**
- Create: `src/pages/StepperLayout.tsx`

- [ ] **Step 1: Create `src/pages/StepperLayout.tsx`**

The stepper layout shares the same props/state as the three-column planner but renders a two-panel view: left = trainee card, right = context-dependent panel.

```tsx
import type { Tribesman, SlotState, TraitMatch } from '../lib/types'
import type { PoolTrait } from '../lib/planner'
import { TraineePanel } from '../components/TraineePanel'
import { TraitPicker } from '../components/TraitPicker'
import { MentorPanel } from '../components/MentorPanel'

interface Props {
  roster: Tribesman[]
  traineeId: string | null
  onSelectTrainee: (id: string) => void
  slots: SlotState[]
  activeSlotIdx: number | null
  onSlotClick: (idx: number) => void
  onToggleKeep: (idx: number) => void
  onClearSlot: (idx: number) => void
  useForgetfulness: boolean
  onToggleForgetfulness: () => void
  traitLookup: Map<string, TraitMatch>
  pool: PoolTrait[]
  traitSearch: string
  onSearchChange: (s: string) => void
  desiredTraitIds: Set<string>
  onSelectTrait: (id: string) => void
  focusTraitId: string | null
}

export function StepperLayout(props: Props) {
  const {
    roster, traineeId, onSelectTrainee, slots, activeSlotIdx,
    onSlotClick, onToggleKeep, onClearSlot, useForgetfulness,
    onToggleForgetfulness, traitLookup, pool, traitSearch,
    onSearchChange, desiredTraitIds, onSelectTrait, focusTraitId,
  } = props

  const activeSlot = activeSlotIdx !== null ? slots[activeSlotIdx] : null
  const showPicker = activeSlot && (activeSlot.type === 'empty' || activeSlot.type === 'replace')
  const showMentors = (activeSlot && activeSlot.type === 'planned') || (activeSlotIdx === null && desiredTraitIds.size > 0)

  return (
    <div className="grid h-full min-h-0" style={{ gridTemplateColumns: '280px 1fr' }}>
      <div className="border-r border-border-soft overflow-hidden" style={{ background: 'oklch(0.155 0.006 130)' }}>
        <TraineePanel
          roster={roster}
          traineeId={traineeId}
          onSelectTrainee={onSelectTrainee}
          slots={slots}
          activeSlotIdx={activeSlotIdx}
          onSlotClick={onSlotClick}
          onToggleKeep={onToggleKeep}
          onClearSlot={onClearSlot}
          useForgetfulness={useForgetfulness}
          onToggleForgetfulness={onToggleForgetfulness}
          traitLookup={traitLookup}
        />
      </div>
      <div className="overflow-hidden">
        {showPicker && (
          <TraitPicker
            pool={pool}
            search={traitSearch}
            onSearchChange={onSearchChange}
            selectedIds={desiredTraitIds}
            onSelect={onSelectTrait}
            activeSlotIdx={activeSlotIdx}
          />
        )}
        {showMentors && (
          <MentorPanel
            roster={roster}
            desiredTraitIds={desiredTraitIds}
            focusTraitId={focusTraitId}
            traineeId={traineeId}
          />
        )}
        {!showPicker && !showMentors && traineeId && (
          <div className="grid place-items-center h-full" style={{ padding: 40 }}>
            <div style={{ textAlign: 'center', color: 'var(--color-faint)', fontSize: 13, maxWidth: 320 }}>
              <p style={{ fontStyle: 'italic', marginBottom: 12 }}>Click a slot on the left to get started.</p>
              <p>Empty slots open the trait picker. Planned slots show mentor recommendations.</p>
            </div>
          </div>
        )}
        {!traineeId && (
          <div className="grid place-items-center h-full" style={{ padding: 40 }}>
            <div style={{ textAlign: 'center', color: 'var(--color-faint)', fontSize: 13, fontStyle: 'italic' }}>
              Select a trainee to begin planning.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --dir . typecheck`
Expected: passes

- [ ] **Step 3: Commit**

```bash
git add src/pages/StepperLayout.tsx
git commit -m "feat: add stepper layout (two-panel) for training planner"
```

---

### Task 10: Layout toggle and refactor TrainingPlanner to support both layouts

**Files:**
- Modify: `src/pages/TrainingPlanner.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Icons.tsx`

- [ ] **Step 1: Add IcoStepper icon to `src/components/Icons.tsx`**

Append to the file:

```tsx
export function IcoStepper({ size = 12 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="10" y1="3" x2="10" y2="21" />
    </svg>
  )
}

export function IcoPlanner({ size = 12 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  )
}
```

- [ ] **Step 2: Refactor `TrainingPlanner.tsx` to extract shared state and support both layouts**

Replace the full content of `src/pages/TrainingPlanner.tsx` with:

```tsx
import { useState, useMemo, useCallback } from 'react'
import type { Tribesman, SlotState, TraitMatch, PlannerLayout } from '../lib/types'
import { buildSlots, buildTraitPool } from '../lib/planner'
import { MOCK_ROSTER } from '../lib/data'
import { TraineePanel } from '../components/TraineePanel'
import { TraitPicker } from '../components/TraitPicker'
import { MentorPanel } from '../components/MentorPanel'
import { StepperLayout } from './StepperLayout'

export function TrainingPlanner({ layout }: { layout: PlannerLayout }) {
  const roster = MOCK_ROSTER

  const [traineeId, setTraineeId] = useState<string | null>(null)
  const [slots, setSlots] = useState<SlotState[]>(Array.from({ length: 6 }, () => ({ type: 'empty' as const })))
  const [useForgetfulness, setUseForgetfulness] = useState(false)
  const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null)
  const [traitSearch, setTraitSearch] = useState('')

  const trainee = roster.find(tm => tm.id === traineeId) ?? null

  const handleSelectTrainee = useCallback((id: string) => {
    setTraineeId(id)
    const tm = roster.find(t => t.id === id)
    if (tm) {
      setSlots(buildSlots(tm))
      setActiveSlotIdx(null)
      setTraitSearch('')
    }
  }, [roster])

  const handleToggleKeep = useCallback((idx: number) => {
    setSlots(prev => prev.map((s, i) => {
      if (i !== idx) return s
      if (s.type === 'keep') return { ...s, type: 'replace' as const }
      if (s.type === 'replace') return { ...s, type: 'keep' as const }
      return s
    }))
  }, [])

  const handleSlotClick = useCallback((idx: number) => {
    const slot = slots[idx]
    if (slot.type === 'empty' || slot.type === 'planned' || slot.type === 'replace') {
      setActiveSlotIdx(idx)
    }
  }, [slots])

  const handleClearSlot = useCallback((idx: number) => {
    setSlots(prev => prev.map((s, i) => {
      if (i !== idx) return s
      if (s.originalTrait) return { type: 'replace' as const, originalTrait: s.originalTrait }
      return { type: 'empty' as const }
    }))
    setActiveSlotIdx(null)
  }, [])

  const handleToggleForgetfulness = useCallback(() => {
    setUseForgetfulness(prev => {
      if (prev) {
        setSlots(s => s.map(slot =>
          slot.type === 'replace' ? { ...slot, type: 'keep' as const } : slot
        ))
      }
      return !prev
    })
  }, [])

  const keptTraitIds = useMemo(
    () => new Set(slots.filter(s => s.type === 'keep' && s.originalTrait).map(s => s.originalTrait!.id)),
    [slots],
  )

  const desiredTraitIds = useMemo(
    () => new Set(slots.filter(s => s.type === 'planned' && s.desiredTraitId).map(s => s.desiredTraitId!)),
    [slots],
  )

  const pool = useMemo(
    () => buildTraitPool(roster, trainee?.clan ?? '', keptTraitIds),
    [roster, trainee?.clan, keptTraitIds],
  )

  const traitLookup = useMemo(() => {
    const map = new Map<string, TraitMatch>()
    for (const tm of roster) {
      for (const t of tm.traits) {
        if (!map.has(t.id) || t.star > map.get(t.id)!.star) map.set(t.id, t)
      }
    }
    return map
  }, [roster])

  const handleSelectTrait = useCallback((traitId: string) => {
    if (activeSlotIdx === null) return
    setSlots(prev => prev.map((s, i) => {
      if (i !== activeSlotIdx) return s
      return { ...s, type: 'planned' as const, desiredTraitId: traitId }
    }))
    setActiveSlotIdx(null)
    setTraitSearch('')
  }, [activeSlotIdx])

  const focusTraitId = activeSlotIdx !== null && slots[activeSlotIdx]?.type === 'planned'
    ? slots[activeSlotIdx].desiredTraitId ?? null
    : null

  const sharedProps = {
    roster, traineeId, onSelectTrainee: handleSelectTrainee, slots,
    activeSlotIdx, onSlotClick: handleSlotClick, onToggleKeep: handleToggleKeep,
    onClearSlot: handleClearSlot, useForgetfulness,
    onToggleForgetfulness: handleToggleForgetfulness, traitLookup,
    pool, traitSearch, onSearchChange: setTraitSearch,
    desiredTraitIds, onSelectTrait: handleSelectTrait, focusTraitId,
  }

  if (layout === 'stepper') {
    return <StepperLayout {...sharedProps} />
  }

  return (
    <div className="grid h-full min-h-0" style={{ gridTemplateColumns: '240px 1fr 280px' }}>
      <div className="border-r border-border-soft overflow-hidden" style={{ background: 'oklch(0.155 0.006 130)' }}>
        <TraineePanel
          roster={roster}
          traineeId={traineeId}
          onSelectTrainee={handleSelectTrainee}
          slots={slots}
          activeSlotIdx={activeSlotIdx}
          onSlotClick={handleSlotClick}
          onToggleKeep={handleToggleKeep}
          onClearSlot={handleClearSlot}
          useForgetfulness={useForgetfulness}
          onToggleForgetfulness={handleToggleForgetfulness}
          traitLookup={traitLookup}
        />
      </div>
      <div className="border-r border-border-soft overflow-hidden">
        <TraitPicker
          pool={pool}
          search={traitSearch}
          onSearchChange={setTraitSearch}
          selectedIds={desiredTraitIds}
          onSelect={handleSelectTrait}
          activeSlotIdx={activeSlotIdx}
        />
      </div>
      <div className="overflow-hidden">
        <MentorPanel
          roster={roster}
          desiredTraitIds={desiredTraitIds}
          focusTraitId={focusTraitId}
          traineeId={traineeId}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update `src/App.tsx` — add layout toggle to planner top bar**

Add imports at the top:

```typescript
import { IcoPlanner, IcoStepper } from './components/Icons'
import type { PlannerLayout } from './lib/types'
```

Add state after the other state declarations:

```typescript
const [plannerLayout, setPlannerLayout] = useState<PlannerLayout>(() =>
  (localStorage.getItem('plannerLayout') as PlannerLayout) || 'planner'
)
```

Replace the planner top bar added in Task 8 with a version that includes the layout toggle:

```tsx
          {screen === 'planner' && <div
            className="flex items-center gap-4 shrink-0"
            style={{
              height: 56,
              padding: '0 22px',
              borderBottom: '1px solid var(--color-border-soft)',
              background: 'oklch(0.165 0.006 130 / 0.7)',
            }}
          >
            <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 22, margin: 0, letterSpacing: '0.01em' }}>
              Training <em style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--color-accent)', marginLeft: 2 }}>Planner</em>
            </h1>
            <span className="flex-1" />
            <div
              className="inline-flex gap-px rounded-[var(--radius)]"
              style={{
                height: 30,
                border: '1px solid var(--color-border)',
                background: 'oklch(0.18 0.008 130)',
                padding: 2,
              }}
            >
              <SegBtn on={plannerLayout === 'planner'} onClick={() => { setPlannerLayout('planner'); localStorage.setItem('plannerLayout', 'planner') }}>
                <IcoPlanner />Planner
              </SegBtn>
              <SegBtn on={plannerLayout === 'stepper'} onClick={() => { setPlannerLayout('stepper'); localStorage.setItem('plannerLayout', 'stepper') }}>
                <IcoStepper />Stepper
              </SegBtn>
            </div>
          </div>}
```

Update the planner render to pass the layout prop:

```tsx
            {screen === 'planner' && (
              <TrainingPlanner layout={plannerLayout} />
            )}
```

- [ ] **Step 4: Verify typecheck**

Run: `pnpm --dir . typecheck`
Expected: passes

- [ ] **Step 5: Test both layouts in browser**

Open http://localhost:1803. Switch between Planner and Stepper using the toggle. Verify:
- Three-column layout renders correctly in Planner mode
- Two-panel layout renders correctly in Stepper mode
- State is preserved when switching layouts
- Layout preference persists across page reloads

- [ ] **Step 6: Commit**

```bash
git add src/pages/TrainingPlanner.tsx src/pages/StepperLayout.tsx src/components/Icons.tsx src/App.tsx
git commit -m "feat: add stepper layout and layout toggle for training planner"
```

---

### Task 11: Full workflow test in browser

**Files:**
- Modify: `src/pages/TrainingPlanner.tsx` (if needed)
- Modify: various components (if needed)

- [ ] **Step 1: Open the app and test the full workflow**

Open http://localhost:1803. Test:
1. Click planner in left rail — screen loads
2. Select a trainee from dropdown — slots populate with their hexagon traits
3. Toggle forgetfulness — filled slots become toggleable between KEEP/REPLACE
4. Click an empty/replace slot — it highlights as active
5. Pick a trait from the center panel — slot fills, becomes planned
6. Mentor panel shows ranked mentors with percentages
7. Clear a planned trait — slot returns to empty/replace
8. Switch trainee — everything resets

- [ ] **Step 2: Fix any visual issues found during testing**

Address spacing, overflow, color inconsistencies discovered during browser testing. The specific fixes depend on what's found.

- [ ] **Step 3: Verify typecheck one final time**

Run: `pnpm --dir . typecheck`
Expected: passes

- [ ] **Step 4: Commit any polish changes**

```bash
git add -A
git commit -m "fix: polish training planner layout and interactions"
```
