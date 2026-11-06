import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { formatAgentTypeLabel } from '../../../../shared/agent-status/presentation/agent-type-label'
import type { DashboardSnapshot } from '../../../../shared/dashboard-snapshot'
import ManagerDeskMenu from './ManagerDeskMenu'
import type { OfficeFloor } from './office-floors'
import { launchManager, mainWorkspaceOf } from './office-managers'

/** Hiring a floor's manager at its empty desk: pick the agent, and it starts in the main workspace. */
export default function OfficeManagerHire({
  anchor,
  arriving,
  floor,
  snapshot,
  onHiring,
  onHired,
  onClose
}: {
  anchor: { left: number; top: number }
  /** A manager was just hired here and is still starting. */
  arriving: boolean
  floor: OfficeFloor
  snapshot: DashboardSnapshot
  /** A manager is starting: hold its desk so a second click does not hire another. */
  onHiring: () => void
  /** The new manager's pane, once Orca has started it. */
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
      arriving={arriving}
      workspace={workspace}
      agents={agents}
      onClose={onClose}
      onHire={(agent) => {
        if (!workspace) {
          return
        }
        onHiring()
        launchManager(workspace, agent, floor.name).then(onHired, () => {
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
