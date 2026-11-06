import type { DashboardSnapshot } from '../../../../shared/dashboard-snapshot'
import type { HireChoice } from './HireDeskMenu'

/** The floor's workspaces whose host can start another agent, and which agents it can start. */
export function hireChoices(snapshot: DashboardSnapshot, floorId: string): HireChoice[] {
  const launchable = snapshot.launchableAgentsByWorktreeId ?? {}
  return (snapshot.workspaces ?? []).flatMap((workspace) => {
    const agents = launchable[workspace.worktreeId] ?? []
    return workspace.repoId === floorId && agents.length > 0 ? [{ workspace, agents }] : []
  })
}
