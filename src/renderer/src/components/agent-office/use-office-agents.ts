import { useMemo } from 'react'
import { useAppStore } from '@/store'
import type { DashboardSnapshot, DashboardWorkspace } from '../../../../shared/dashboard-snapshot'
import { officeAgentsFrom, type OfficeAgent } from './office-agents'
import { crewRoleKey, crewRolesFrom } from './office-crew-roles'
import { sleepersFrom } from './office-sleepers'
import type { StaffPets } from './office-staff-pets'

const NO_WORKSPACES: DashboardWorkspace[] = []

function visibleKey(a: OfficeAgent): string {
  return [
    a.key,
    a.floorId,
    a.bucket,
    a.petId,
    a.name,
    a.agentType,
    a.worktreeId,
    a.worktreeName,
    a.since,
    a.verdict ?? '',
    a.monitoring ? 'm' : '',
    a.manager ? 'boss' : '',
    a.asleep ? 'asleep' : '',
    a.remoteHost ?? '',
    crewRoleKey(a.crew),
    a.review ? `${a.review.number}${a.review.state}` : '',
    a.workspaceStatus ? `${a.workspaceStatus.id}=${a.workspaceStatus.label}` : '',
    a.workspaceStatus?.color ?? '',
    a.parentKey ?? '',
    ...a.subagents.map((s) => `${s.key}=${s.bucket}=${s.name}`)
  ].join(':')
}

/** The office's agents from the live snapshot and the slept ones, rebuilt only when something they show changes. */
export function useOfficeAgents(
  { cards, workspaces = NO_WORKSPACES }: Pick<DashboardSnapshot, 'cards' | 'workspaces'>,
  staffPets: StaffPets,
  managerKeys: ReadonlySet<string>
): OfficeAgent[] {
  const statusByPaneKey = useAppStore((s) => s.agentStatusByPaneKey)
  const dispatchByPaneKey = useAppStore((s) => s.runtimeAgentOrchestrationByPaneKey)
  const sleepRecords = useAppStore((s) => s.sleepingAgentSessionsByPaneKey)
  const tabsByWorktree = useAppStore((s) => s.tabsByWorktree)
  const crewRoles = useMemo(
    () => crewRolesFrom(cards, statusByPaneKey, dispatchByPaneKey),
    [cards, statusByPaneKey, dispatchByPaneKey]
  )
  const fresh = [
    ...officeAgentsFrom(cards, staffPets, crewRoles, managerKeys),
    ...sleepersFrom(sleepRecords, tabsByWorktree, cards, workspaces, staffPets)
  ]
  // Why: the snapshot rebuilds on every status tick; reseat the floor only when what it shows changes.
  const key = fresh.map(visibleKey).join('|')
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the visible fields above
  return useMemo(() => fresh, [key])
}
