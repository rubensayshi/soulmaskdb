# Training planner design

Plan optimal training sequences for tribesmen by selecting a trainee, marking which existing traits to keep or replace, picking desired traits from the roster's available pool, and seeing which mentors give the best odds per training attempt.

## Game mechanics summary

- Training Grounds (v1.0): mentor must be lvl 50+, transfers one random Normal (hexagon) trait to trainee, ~90 min per session
- Only `Normal` source traits are trainable — not innate (shield), preferences (diamond), titles, experience, or personality
- 6 talent slots, unlocked at levels 10/20/30/40/50/60
- Clan-exclusive traits only transfer within that clan; cross-clan training is otherwise allowed
- Forgetfulness potion removes most recently learned talent (expensive, random wipe)
- Training picks randomly from all mentor's Normal traits — odds = desired / total

## Workflow

1. **Pick trainee** — dropdown from roster. Shows name, level, clan, class.
2. **Review 6 hexagon slots** — each filled slot defaults to KEEP. Empty slots are plannable.
   - Toggle: "Forgetfulness potion" — when ON, filled slots become toggleable between KEEP and REPLACE. When OFF, all filled slots are locked as KEEP.
   - Click KEEP to flip to REPLACE (frees the slot for planning). Click REPLACE to flip back.
3. **Fill plannable slots** — click a slot to activate the trait picker.
   - Trait pool = union of all Normal hexagon traits across lvl 50+ roster members.
   - Filtered out: negative traits, already-kept traits, clan-exclusive traits incompatible with trainee's clan.
   - Negative traits (`is_negative: true`) hidden. No further "weak" filtering — the pool is already scoped to what mentors actually have.
   - Search by name + filter by effect category chips.
4. **See mentor recommendations** — for each desired trait, ranked by `desiredCount / totalNormalCount`.
   - Highlights mentors who cover multiple desired traits.
   - Flags mentors under lvl 50 as ineligible.

## Layouts

Two switchable layouts, toggled top-right (same pattern as roster's table/cards/split). Persisted to localStorage as `plannerLayout`.

### Layout A: three-column planner (default)

Three panels visible simultaneously:
- **Left (240px)**: trainee dropdown, forgetfulness toggle, 6 trait slots
- **Center (flex)**: searchable trait picker with category filter chips
- **Right (280px)**: mentor cards ranked by odds for the selected desired trait

### Layout B: two-panel stepper

- **Left (280px)**: trainee card with 6 trait slots (same as layout A but wider)
- **Right (flex)**: contextual panel that changes based on active slot:
  - `activeSlotIdx === null` → summary/tips
  - Click empty/replace slot → trait picker
  - Click planned slot → mentor panel for that trait
  - All slots filled → full mentor plan overview

Both layouts share the same state — switching layouts preserves all selections.

## State

Local React state in `TrainingPlanner.tsx`. No zustand store, no persistence, no backend endpoints.

```typescript
interface SlotState {
  type: 'keep' | 'replace' | 'empty' | 'planned'
  originalTrait?: TraitMatch
  desiredTraitId?: string
}

interface PlannerState {
  traineeId: string | null
  slots: SlotState[]          // always 6 entries
  useForgetfulness: boolean
  activeSlotIdx: number | null
  traitSearch: string
  traitFilter: string | null
}
```

Derived values (computed, not stored):
- `availableTraits`: union of hexagon traits across lvl 50+ roster members, minus negatives, minus already-kept, minus clan-incompatible
- `mentorsForTrait(id)`: roster members who have this trait and are lvl 50+, sorted by `desiredCount / totalNormalCount` descending

Data source: reads from existing `useRosterStore.tribesmen[]`. Trait metadata (source, clan, star) comes from the trait matching data already used by OCR.

## Trait families

Normal traits have `learned_id` chains (star 1 → 2 → 3). If the user picks "Chain Dodge ★★★" but a mentor has "Chain Dodge ★★", that still counts as a match — training transfers the family, tier depends on the mentor's version. The picker shows the highest tier available and the mentor panel shows which tier each mentor actually has.

## Edge cases

| Case | Behavior |
| --- | --- |
| No eligible mentors for a trait | Trait grayed out in picker with "No mentor available", not selectable |
| Trainee under lvl 10 | All 6 slots shown as locked with level labels. Planning still allowed (aspirational) |
| Clan-exclusive mismatch | Filtered out of trait picker based on trainee's clan |
| Forgetfulness toggle OFF | All filled hexagon slots locked as KEEP, only empty slots plannable |
| Empty roster | Empty state pointing to Capture screen |
| No lvl 50+ mentors | Trainee selectable but trait pool empty with message |

## Components

```
src/
  pages/
    TrainingPlanner.tsx     — state + layout switch + grid shell
  components/
    TraineePanel.tsx        — trainee dropdown, slot list, forgetfulness toggle
    TraitSlot.tsx           — single slot with keep/replace/empty/planned states
    TraitPicker.tsx         — searchable trait list, category filter chips
    MentorPanel.tsx         — mentor cards ranked by odds
    MentorCard.tsx          — individual mentor: name, %, trait breakdown
  lib/
    planner.ts              — pure functions: buildTraitPool, rankMentors, slotDefaults
    types.ts                — add SlotState, PlannerLayout types
```

## Integration with App.tsx

- New `screen` value: `'planner'`
- New nav item in left rail between Roster and Capture
- Icon: target/crosshair or similar (consistent with existing nav style)

## Out of scope

- Save/load builds
- Probability chain modeling
- Multi-trainee planning
- Training order optimizer
- Potion cost tracking
