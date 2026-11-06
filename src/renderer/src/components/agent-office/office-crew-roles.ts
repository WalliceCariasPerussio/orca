import type {
  AgentStatusEntry,
  AgentStatusOrchestrationContext
} from '../../../../shared/agent-status/contracts/agent-status-types'
import { formatAgentTypeLabel } from '../../../../shared/agent-status/presentation/agent-type-label'
import type { DashboardCard } from '../../../../shared/dashboard-snapshot'

/** An agent's place in an Orca orchestration: it dispatches work to others, or does a task for one. */
export type OfficeCrewRole =
  | { kind: 'managing'; count: number }
  | { kind: 'managed'; by: string; task?: string }

function nameOf(card: DashboardCard): string {
  return card.conversationName || card.task || formatAgentTypeLabel(card.agentType)
}

/** Who manages whom, from the dispatch context Orca keeps for each agent pane. */
export function crewRolesFrom(
  cards: readonly DashboardCard[],
  statusByPaneKey: Readonly<Record<string, AgentStatusEntry>>,
  dispatchByPaneKey: Readonly<Record<string, AgentStatusOrchestrationContext>>
): Map<string, OfficeCrewRole> {
  const byKey = new Map(cards.map((card) => [card.paneKey, card]))
  const roles = new Map<string, OfficeCrewRole>()
  const managing = new Map<string, number>()
  for (const card of cards) {
    const dispatch = statusByPaneKey[card.paneKey]?.orchestration ?? dispatchByPaneKey[card.paneKey]
    if (!dispatch?.taskId) {
      continue
    }
    const coordinator = dispatch.parentPaneKey ? byKey.get(dispatch.parentPaneKey) : undefined
    const by = coordinator ? nameOf(coordinator) : (dispatch.coordinatorHandle ?? '')
    roles.set(card.paneKey, { kind: 'managed', by, task: dispatch.taskTitle?.trim() || undefined })
    if (coordinator) {
      managing.set(coordinator.paneKey, (managing.get(coordinator.paneKey) ?? 0) + 1)
    }
  }
  // Why: a coordinator that is also someone's worker reads best as the one in charge.
  for (const [paneKey, count] of managing) {
    roles.set(paneKey, { kind: 'managing', count })
  }
  return roles
}

export function crewRoleKey(role: OfficeCrewRole | undefined): string {
  if (!role) {
    return ''
  }
  return role.kind === 'managing' ? `m${role.count}` : `w${role.by}>${role.task ?? ''}`
}
