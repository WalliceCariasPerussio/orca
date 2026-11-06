import { getSleepingRecordTabId } from '@/lib/sleeping-agent-wake-requests'
import { useAppStore } from '@/store'
import {
  isPaneSleepRecord,
  type SleepingAgentSessionRecord
} from '../../../../shared/agent-session/lifecycle/agent-session-resume'
import type { DashboardCard, DashboardWorkspace } from '../../../../shared/dashboard-snapshot'
import { mountAgentTerminal } from './office-agent-launch'
import { workspaceStatusOf, type OfficeAgent } from './office-agents'
import { roleForAgentType, type StaffPets } from './office-staff-pets'

type SleepRecords = Readonly<Record<string, SleepingAgentSessionRecord>>
type TabsByWorktree = Readonly<Record<string, readonly { id: string }[]>>

// Why: a record whose tab was closed can never wake, so it would doze at its desk forever.
function wakeableTab(record: SleepingAgentSessionRecord, tabs: TabsByWorktree): string | null {
  const tabId = getSleepingRecordTabId(record)
  const kept = tabId !== null && (tabs[record.worktreeId] ?? []).some((tab) => tab.id === tabId)
  return kept && isPaneSleepRecord(record) ? tabId : null
}

/** Agents of a workspace put to sleep: their terminal is closed, and they doze at their desk. */
export function sleepersFrom(
  records: SleepRecords,
  tabs: TabsByWorktree,
  cards: readonly DashboardCard[],
  workspaces: readonly DashboardWorkspace[],
  staffPets: StaffPets
): OfficeAgent[] {
  const awake = new Set(cards.map((card) => card.paneKey))
  const byId = new Map(workspaces.map((workspace) => [workspace.worktreeId, workspace]))
  return Object.values(records).flatMap((record): OfficeAgent[] => {
    const workspace = byId.get(record.worktreeId)
    if (!workspace || awake.has(record.paneKey) || wakeableTab(record, tabs) === null) {
      return []
    }
    return [
      {
        key: record.paneKey,
        floorId: workspace.repoId,
        name: record.terminalTitle || record.prompt || record.agent,
        agentType: record.agent,
        bucket: 'idle',
        petId: staffPets[roleForAgentType(record.agent)],
        worktreeId: record.worktreeId,
        worktreeName: workspace.worktreeName,
        review: workspace.review,
        workspaceStatus: workspaceStatusOf(workspace),
        startedAt: record.capturedAt,
        since: record.capturedAt,
        asleep: true,
        subagents: []
      }
    ]
  })
}

/** The tabs of a workspace's sleeping agents, or of just one of them. */
export function sleeperTabs(
  records: SleepRecords,
  tabs: TabsByWorktree,
  worktreeId: string,
  paneKey?: string
): string[] {
  return Object.values(records).flatMap((record) => {
    const tabId = record.worktreeId === worktreeId ? wakeableTab(record, tabs) : null
    return tabId && (paneKey === undefined || record.paneKey === paneKey) ? [tabId] : []
  })
}

/**
 * Wakes sleeping agents without leaving the office: their tabs mount in the background, which
 * is how Orca resumes a slept agent it is asked for. Returns how many it woke.
 */
export function wakeSleepers(worktreeId: string, paneKey?: string): number {
  const { sleepingAgentSessionsByPaneKey: records, tabsByWorktree } = useAppStore.getState()
  const tabIds = sleeperTabs(records, tabsByWorktree, worktreeId, paneKey)
  for (const tabId of new Set(tabIds)) {
    mountAgentTerminal(worktreeId, tabId)
  }
  return tabIds.length
}
