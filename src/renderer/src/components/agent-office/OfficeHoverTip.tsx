import { translate } from '@/i18n/i18n'
import type { DashboardBucket } from '../../../../shared/dashboard-snapshot'
import type { OfficeHover } from './office-building'

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

/** Same label in the same place: keeps the tip still as the pointer moves, but not after a resize or a new state. */
export function hoverKey(hover: OfficeHover | null | undefined): string | null {
  if (!hover) {
    return null
  }
  const place = `${hover.left},${hover.top}`
  return hover.kind === 'agent'
    ? `agent:${hover.agent.key}:${hover.agent.bucket}:${hover.agent.name}:${place}`
    : `spot:${hover.spot}:${place}`
}

/** The label over whatever the pointer rests on: an agent, or the team board. */
export default function OfficeHoverTip({ hover }: { hover: OfficeHover }): React.JSX.Element {
  return (
    <div
      className="pointer-events-none absolute z-10 max-w-64 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-floating"
      style={{ left: hover.left, top: hover.top }}
    >
      {hover.kind === 'agent' ? (
        <>
          <p className="truncate font-medium">{hover.agent.name}</p>
          <p className="text-muted-foreground">
            {bucketLabel(hover.agent.bucket)} ·{' '}
            {translate(
              'auto.components.agentOffice.building.openTerminal',
              'click to open the terminal'
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
