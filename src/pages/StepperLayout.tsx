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
  const showPicker = activeSlot != null && (activeSlot.type === 'empty' || activeSlot.type === 'replace')
  const showMentors = (activeSlot != null && activeSlot.type === 'planned') || (activeSlotIdx === null && desiredTraitIds.size > 0)

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
