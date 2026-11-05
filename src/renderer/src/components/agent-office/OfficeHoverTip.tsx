import { translate } from '@/i18n/i18n'
import { formatUiRelativeTime } from '@/i18n/relative-time-format'
import type { DashboardBucket } from '../../../../shared/dashboard-snapshot'
import type { OfficeVerdict } from './office-agents'
import type { OfficeHover } from './office-building-setup'

function bucketLabel(bucket: DashboardBucket): string {
  switch (bucket) {
    case 'attention':
      return translate('dashboardPopout.bucket.attention', 'Needs You')
    case 'working':
      return translate('dashboardPopout.bucket.working', 'Working')
    case 'done':
      return translate('dashboardPopout.bucket.done', 'Done')
    case 'idle':
      return translate('dashboardPopout.bucket.idle', 'Idle')
  }
}

function stateLabel(bucket: DashboardBucket, verdict: OfficeVerdict | undefined): string {
  if (verdict === 'failed') {
    return translate('auto.components.AgentStateDot.failed', 'Failed')
  }
  if (verdict === 'interrupted') {
    return translate('auto.components.AgentStateDot.interrupted', 'Interrupted')
  }
  return bucketLabel(bucket)
}

/** Same label in the same place: keeps the tip still as the pointer moves, but not after a resize or a new state. */
export function hoverKey(hover: OfficeHover | null | undefined): string | null {
  if (!hover) {
    return null
  }
  const place = `${hover.left},${hover.top}`
  return hover.kind === 'agent'
    ? `agent:${hover.agent.key}:${hover.agent.bucket}:${hover.agent.verdict ?? ''}:${hover.agent.name}:${hover.agent.worktreeName}:${place}`
    : `spot:${hover.spot}:${place}`
}

/** The label over whatever the pointer rests on: an agent, the team board or a free desk. */
export default function OfficeHoverTip({
  hover,
  thought
}: {
  hover: OfficeHover
  /** What the agent under the pointer thinks, in full. */
  thought?: string
}): React.JSX.Element {
  return (
    <div
      className="pointer-events-none absolute z-10 max-w-72 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-floating"
      style={{ left: hover.left, top: hover.top }}
    >
      {hover.kind === 'agent' ? (
        <>
          <p className="truncate font-medium">{hover.agent.name}</p>
          <p className="truncate text-muted-foreground">
            {translate('auto.components.agentOffice.building.workspace', 'Workspace: {{value0}}', {
              value0: hover.agent.worktreeName
            })}
          </p>
          <p className="text-muted-foreground">
            {stateLabel(hover.agent.bucket, hover.agent.verdict)}
            {hover.agent.since > 0
              ? ` · ${formatUiRelativeTime(hover.agent.since - hover.seenAt)}`
              : ''}{' '}
            ·{' '}
            {translate(
              'auto.components.agentOffice.building.openTerminal',
              'click to open the terminal'
            )}
          </p>
          {thought ? (
            <p className="mt-1 line-clamp-3 border-t border-border pt-1 italic">{thought}</p>
          ) : null}
        </>
      ) : hover.spot === 'freeDesk' ? (
        <>
          <p className="truncate font-medium">
            {translate('auto.components.agentOffice.hire.desk', 'Free desk')}
          </p>
          <p className="text-muted-foreground">
            {translate(
              'auto.components.agentOffice.hire.deskHint',
              'click to hire an agent for this project'
            )}
          </p>
        </>
      ) : (
        <>
          <p className="truncate font-medium">
            {translate('auto.components.agentOffice.team.board', 'Floor team')}
          </p>
          <p className="text-muted-foreground">
            {translate(
              'auto.components.agentOffice.team.boardHint',
              'click to pick the pets that work here'
            )}
          </p>
        </>
      )}
    </div>
  )
}
