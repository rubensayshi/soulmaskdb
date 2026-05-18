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
          <MentorCard key={m.tribesman.id} mentor={m} />
        ))}
      </div>
    </div>
  )
}
