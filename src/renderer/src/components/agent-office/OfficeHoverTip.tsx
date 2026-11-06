import { translate } from '@/i18n/i18n'
import { formatUiRelativeTime } from '@/i18n/relative-time-format'
import { formatAgentTypeLabel } from '../../../../shared/agent-status/presentation/agent-type-label'
import type { Automation } from '../../../../shared/automations-types'
import type { AgentStatusEntry } from '../../../../shared/agent-status/contracts/agent-status-types'
import AutomationsTipBody from './AutomationsTipBody'
import CrewRoleLine from './CrewRoleLine'
import { crewRoleKey } from './office-crew-roles'
import StateTimeline from './StateTimeline'
import type { DashboardBucket, DashboardCardReview } from '../../../../shared/dashboard-snapshot'
import { isNapping, type OfficeAgent } from './office-agents'
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

function stateLabel(agent: OfficeAgent, time: number): string {
  const { bucket, verdict } = agent
  if (isNapping(agent, time)) {
    return translate('auto.components.agentOffice.building.napping', 'Dozing')
  }
  if (verdict === 'failed') {
    return translate('auto.components.AgentStateDot.failed', 'Failed')
  }
  if (verdict === 'interrupted') {
    return translate('auto.components.AgentStateDot.interrupted', 'Interrupted')
  }
  if (agent.monitoring && bucket === 'working') {
    return translate('auto.components.AgentStateDot.monitoring', 'Monitoring background tasks')
  }
  return bucketLabel(bucket)
}

function reviewLabel(review: DashboardCardReview): string {
  switch (review.state) {
    case 'open':
      return translate('dashboardPopout.card.review.open', 'Open review')
    case 'draft':
      return translate('dashboardPopout.card.review.draft', 'Draft review')
    case 'merged':
      return translate('dashboardPopout.card.review.merged', 'Merged review')
    case 'closed':
      return translate('dashboardPopout.card.review.closed', 'Closed review')
  }
}

const NO_AUTOMATIONS: readonly Automation[] = []

/** Same label in the same place: keeps the tip still as the pointer moves, but not after a resize or a new state. */
export function hoverKey(hover: OfficeHover | null | undefined): string | null {
  if (!hover) {
    return null
  }
  const place = `${hover.left},${hover.top}`
  if (hover.kind === 'sector') {
    return `sector:${hover.worktreeName}:${place}`
  }
  if (hover.kind === 'spot') {
    return `spot:${hover.spot}:${place}`
  }
  const { agent } = hover
  const state = `${agent.bucket}:${agent.verdict ?? ''}:${agent.monitoring ? 'm' : ''}`
  const workspace = `${agent.worktreeName}:${agent.workspaceStatus?.label ?? ''}:${agent.review?.number ?? ''}${agent.review?.state ?? ''}`
  return `agent:${agent.key}:${state}:${agent.name}:${workspace}:${agent.remoteHost ?? ''}:${crewRoleKey(agent.crew)}:${place}`
}

/** The label over whatever the pointer rests on: an agent, the team board or a free desk. */
export default function OfficeHoverTip({
  hover,
  thought,
  model,
  asked,
  status,
  automations = NO_AUTOMATIONS
}: {
  hover: OfficeHover
  /** What the agent under the pointer thinks, in full. */
  thought?: string
  /** The provider model its session uses, as the Agent Dashboard shows it. */
  model?: string
  /** What you last asked it. */
  asked?: string
  /** Its live status in Orca, with the states it went through. */
  status?: AgentStatusEntry
  /** The floor's automations, for its wall calendar. */
  automations?: readonly Automation[]
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
            {[formatAgentTypeLabel(hover.agent.agentType), model].filter(Boolean).join(' · ')}
          </p>
          <p className="truncate text-muted-foreground">
            {translate('auto.components.agentOffice.building.workspace', 'Workspace: {{value0}}', {
              value0: hover.agent.worktreeName
            })}
            {hover.agent.workspaceStatus ? ` · ${hover.agent.workspaceStatus.label}` : ''}
            {hover.agent.review
              ? ` · ${reviewLabel(hover.agent.review)} #${hover.agent.review.number}`
              : ''}
          </p>
          {hover.agent.remoteHost ? (
            <p className="truncate text-muted-foreground">{hover.agent.remoteHost}</p>
          ) : null}
          {hover.agent.crew ? (
            <CrewRoleLine role={hover.agent.crew} agentName={hover.agent.name} />
          ) : null}
          <p className="text-muted-foreground">
            {stateLabel(hover.agent, hover.seenAt)}
            {hover.agent.since > 0
              ? ` · ${formatUiRelativeTime(hover.agent.since - hover.seenAt)}`
              : ''}{' '}
            ·{' '}
            {translate(
              'auto.components.agentOffice.building.openTerminal',
              'click to open the terminal'
            )}
          </p>
          {asked ? (
            <p className="mt-1 line-clamp-2 border-t border-border pt-1">
              <span className="font-medium text-muted-foreground">
                {translate('dashboardPopout.card.you', 'You')}
              </span>{' '}
              {asked}
            </p>
          ) : null}
          {thought ? (
            <p className="mt-1 line-clamp-3 border-t border-border pt-1 italic">{thought}</p>
          ) : null}
          {status ? <StateTimeline entry={status} seenAt={hover.seenAt} /> : null}
        </>
      ) : hover.kind === 'sector' ? (
        <>
          <p className="truncate font-medium">{hover.worktreeName}</p>
          <p className="text-muted-foreground">
            {translate(
              'auto.components.agentOffice.sector.hint',
              "click for this workspace's menu: status, notes, sleep…"
            )}
          </p>
        </>
      ) : hover.spot === 'automations' ? (
        <AutomationsTipBody automations={automations} seenAt={hover.seenAt} />
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
