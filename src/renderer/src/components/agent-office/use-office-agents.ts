import { useMemo } from 'react'
import { useAppStore } from '@/store'
import type { DashboardCard } from '../../../../shared/dashboard-snapshot'
import { officeAgentsFrom, type OfficeAgent } from './office-agents'
import { crewRoleKey, crewRolesFrom } from './office-crew-roles'
import type { StaffPets } from './office-staff-pets'

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
    a.remoteHost ?? '',
    crewRoleKey(a.crew),
    a.review ? `${a.review.number}${a.review.state}` : '',
    a.workspaceStatus ? `${a.workspaceStatus.id}=${a.workspaceStatus.label}` : '',
    a.workspaceStatus?.color ?? '',
    a.parentKey ?? '',
    ...a.subagents.map((s) => `${s.key}=${s.bucket}=${s.name}`)
  ].join(':')
}

/** The office's agents from the live snapshot, rebuilt only when something they show changes. */
export function useOfficeAgents(
  cards: readonly DashboardCard[],
  staffPets: StaffPets,
  managerKeys: ReadonlySet<string>
): OfficeAgent[] {
  const statusByPaneKey = useAppStore((s) => s.agentStatusByPaneKey)
  const dispatchByPaneKey = useAppStore((s) => s.runtimeAgentOrchestrationByPaneKey)
  const crewRoles = useMemo(
    () => crewRolesFrom(cards, statusByPaneKey, dispatchByPaneKey),
    [cards, statusByPaneKey, dispatchByPaneKey]
  )
  const fresh = officeAgentsFrom(cards, staffPets, crewRoles, managerKeys)
  // Why: the snapshot rebuilds on every status tick; reseat the floor only when what it shows changes.
  const key = fresh.map(visibleKey).join('|')
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the visible fields above
  return useMemo(() => fresh, [key])
}
