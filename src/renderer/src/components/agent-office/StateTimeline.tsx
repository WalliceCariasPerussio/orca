import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import type { AgentStatusEntry } from '../../../../shared/agent-status/contracts/agent-status-types'

const WINDOW_MS = 60 * 60_000

type Stretch = { from: number; to: number; tone: string }

function toneOf(state: AgentStatusEntry['state'], interrupted: boolean | undefined): string {
  switch (state) {
    case 'working':
      return 'bg-(--status-warning)'
    case 'blocked':
    case 'waiting':
      return 'bg-destructive'
    case 'done':
      return interrupted ? 'bg-muted-foreground' : 'bg-(--status-success)'
  }
}

// Why: Orca keeps each agent's last states with when each began; the current one runs until now.
function stretchesOf(entry: AgentStatusEntry, now: number): Stretch[] {
  const start = now - WINDOW_MS
  const states = [
    ...entry.stateHistory.map((past) => ({ ...past })),
    { state: entry.state, startedAt: entry.stateStartedAt, interrupted: entry.interrupted }
  ].toSorted((a, b) => a.startedAt - b.startedAt)
  return states.flatMap((state, i) => {
    const from = Math.max(start, state.startedAt)
    const to = Math.min(now, states[i + 1]?.startedAt ?? now)
    return to > from ? [{ from, to, tone: toneOf(state.state, state.interrupted) }] : []
  })
}

/** The agent's last hour as a strip: working, needing you, done, or unknown before Orca saw it. */
export default function StateTimeline({
  entry,
  seenAt
}: {
  entry: AgentStatusEntry
  seenAt: number
}): React.JSX.Element | null {
  const stretches = stretchesOf(entry, seenAt)
  if (stretches.length === 0) {
    return null
  }
  const start = seenAt - WINDOW_MS
  return (
    <div className="mt-1 border-t border-border pt-1">
      <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
        {stretches.map((stretch) => (
          <span
            key={stretch.from}
            className={cn('absolute inset-y-0', stretch.tone)}
            style={{
              left: `${((stretch.from - start) / WINDOW_MS) * 100}%`,
              width: `${((stretch.to - stretch.from) / WINDOW_MS) * 100}%`
            }}
          />
        ))}
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
        <span>{translate('auto.components.agentOffice.timeline.hourAgo', '1 h ago')}</span>
        <span>{translate('auto.components.agentOffice.timeline.now', 'now')}</span>
      </div>
    </div>
  )
}
