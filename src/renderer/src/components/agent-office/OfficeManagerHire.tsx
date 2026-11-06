import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { formatAgentTypeLabel } from '../../../../shared/agent-status/presentation/agent-type-label'
import type { DashboardSnapshot } from '../../../../shared/dashboard-snapshot'
import ManagerDeskMenu from './ManagerDeskMenu'
import type { OfficeFloor } from './office-floors'
import { launchManager, mainWorkspaceOf, newManagerPane } from './office-managers'

/** Hiring a floor's manager at its empty desk: pick the agent, and it starts in the main workspace. */
export default function OfficeManagerHire({
  anchor,
  floor,
  snapshot,
  onHired,
  onClose
}: {
  anchor: { left: number; top: number }
  floor: OfficeFloor
  snapshot: DashboardSnapshot
  /** The pane the new manager will have, held for its desk before it shows up. */
  onHired: (paneKey: string) => void
  onClose: () => void
}): React.JSX.Element {
  const mainWorktreeId = useAppStore(
    (s) => s.worktreesByRepo[floor.id]?.find((worktree) => worktree.isMainWorktree)?.id
  )
  const workspace = mainWorkspaceOf(snapshot.workspaces ?? [], floor.id, mainWorktreeId)
  const agents = workspace
    ? (snapshot.launchableAgentsByWorktreeId?.[workspace.worktreeId] ?? [])
    : []
  return (
    <ManagerDeskMenu
      anchor={anchor}
      projectName={floor.name}
      workspace={workspace}
      agents={agents}
      onClose={onClose}
      onHire={(agent) => {
        if (!workspace) {
          return
        }
        const paneKey = newManagerPane()
        onHired(paneKey)
        launchManager(workspace, agent, floor.name, paneKey).catch(() => {
          toast.error(
            translate(
              'auto.components.agentOffice.manager.hireFailed',
              'Could not start {{value0}} as the manager of {{value1}}.',
              { value0: formatAgentTypeLabel(agent), value1: floor.name }
            )
          )
        })
      }}
    />
  )
}
