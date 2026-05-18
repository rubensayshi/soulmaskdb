import { useState, useMemo, useCallback } from 'react'
import type { SlotState, TraitMatch, PlannerLayout } from '../lib/types'
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

  const firstFillable = (sl: SlotState[]) =>
    sl.findIndex(s => s.type === 'empty' || s.type === 'replace')

  const handleSelectTrainee = useCallback((id: string) => {
    setTraineeId(id)
    const tm = roster.find(t => t.id === id)
    if (tm) {
      const next = buildSlots(tm)
      setSlots(next)
      setActiveSlotIdx(firstFillable(next) === -1 ? null : firstFillable(next))
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
    setActiveSlotIdx(idx)
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
    setSlots(prev => {
      const next = prev.map((s, i) => {
        if (i !== activeSlotIdx) return s
        return { ...s, type: 'planned' as const, desiredTraitId: traitId }
      })
      const nextIdx = firstFillable(next)
      setActiveSlotIdx(nextIdx === -1 ? null : nextIdx)
      return next
    })
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
