import { useEffect, useRef } from 'react'
import { Ellipsis, Moon, Sun, Trash2, X } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { AgentTypeIcon } from '@/lib/agent-type-icon'
import { useAppStore } from '@/store'
import { useWorktreeById } from '@/store/selectors'
import { formatAgentTypeLabel } from '../../../../shared/agent-status/presentation/agent-type-label'
import type { DashboardSnapshot } from '../../../../shared/dashboard-snapshot'
import { hasSleepableWorkspaceActivity } from '../sidebar/workspace-actions/context-menu/workspace-lineage-menu-actions'
import { Button } from '../ui/button'
import type { OfficeWorkspaceMenuAt } from './OfficeWorkspaceMenu'
import { hireAgentIn } from './office-agent-launch'
import { sectorColor } from './office-sectors'
import { sleeperTabs, wakeSleepers } from './office-sleepers'
import { deleteWorkspace, sleepWorkspace } from './office-workspace-actions'

const ROW =
  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'

/** A workspace's desk, up close: wake it, put it to sleep, hire someone for it, or clear it out. */
export default function WorkspaceDeskMenu({
  at,
  snapshot,
  onOrcaMenu,
  onClose
}: {
  at: OfficeWorkspaceMenuAt
  snapshot: DashboardSnapshot
  /** Opens Orca's full workspace menu, the one a right-click on the desk opens. */
  onOrcaMenu: () => void
  onClose: () => void
}): React.JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null)
  const { worktreeId } = at
  const worktree = useWorktreeById(worktreeId, at.executionHostId)
  const sleepers = useAppStore(
    (s) => sleeperTabs(s.sleepingAgentSessionsByPaneKey, s.tabsByWorktree, worktreeId).length
  )
  const sleepable = useAppStore((s) => hasSleepableWorkspaceActivity(worktreeId, s))
  useEffect(() => {
    panelRef.current?.querySelector<HTMLButtonElement>('button[data-first]')?.focus()
  }, [])
  if (!worktree) {
    return null
  }
  const workspace = snapshot.workspaces?.find((w) => w.worktreeId === worktreeId)
  const agents = snapshot.launchableAgentsByWorktreeId?.[worktreeId] ?? []
  const atWork = snapshot.cards.filter((card) => card.worktreeId === worktreeId).length
  const act = (action: () => void) => () => {
    onClose()
    action()
  }
  const state =
    sleepers > 0
      ? translate('auto.components.agentOffice.desk.asleep', '{{value0}} asleep at their desks', {
          value0: sleepers
        })
      : atWork > 0
        ? translate('auto.components.agentOffice.desk.atWork', '{{value0}} at work here', {
            value0: atWork
          })
        : sleepable
          ? translate('auto.components.agentOffice.desk.open', 'Open, with nobody at the desk')
          : translate('auto.components.agentOffice.desk.empty', 'Nobody here, lights off')
  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={worktree.displayName}
      className="absolute z-10 w-72 -translate-x-1/2 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-floating"
      style={{ left: at.left, top: at.top }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          // Why: the page closes on Escape; here it only steps away from the desk.
          event.preventDefault()
          event.stopPropagation()
          onClose()
        }
      }}
    >
      <div className="flex items-center gap-2 py-0.5 pr-0.5 pl-2">
        <span
          className="h-3.5 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: sectorColor(worktreeId) }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{worktree.displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{state}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={translate('auto.components.agentOffice.reception.desk.close', 'Close')}
          onClick={onClose}
        >
          <X />
        </Button>
      </div>
      {sleepers > 0 ? (
        <button
          type="button"
          data-first
          className={ROW}
          onClick={act(() => wakeSleepers(worktreeId))}
        >
          <Sun className="size-3.5 shrink-0 text-muted-foreground" />
          {translate('auto.components.agentOffice.desk.wake', 'Wake everyone up')}
        </button>
      ) : null}
      {sleepable ? (
        <button
          type="button"
          data-first
          className={ROW}
          onClick={act(() => sleepWorkspace(worktree))}
        >
          <Moon className="size-3.5 shrink-0 text-muted-foreground" />
          {translate('auto.components.agentOffice.desk.sleep', 'Put the workspace to sleep')}
        </button>
      ) : null}
      {workspace && agents.length > 0 ? (
        <div className="flex items-center gap-1 px-2 py-0.5">
          <span className="min-w-0 flex-1 truncate text-sm">
            {translate('auto.components.agentOffice.desk.hire', 'Hire for this desk')}
          </span>
          {agents.map((agent) => {
            const label = translate(
              'auto.components.agentOffice.hire.launch',
              '{{value0}} in {{value1}}',
              { value0: formatAgentTypeLabel(agent), value1: workspace.worktreeName }
            )
            return (
              <Button
                key={agent}
                variant="ghost"
                size="icon-xs"
                title={label}
                aria-label={label}
                onClick={act(() => hireAgentIn(workspace, agent))}
              >
                <AgentTypeIcon agentType={agent} size={14} />
              </Button>
            )
          })}
        </div>
      ) : null}
      <div className="my-1 border-t border-border" />
      <button type="button" data-first className={ROW} onClick={onOrcaMenu}>
        <Ellipsis className="size-3.5 shrink-0 text-muted-foreground" />
        {translate('auto.components.agentOffice.desk.more', 'More workspace options')}
      </button>
      {worktree.isMainWorktree ? null : (
        <button
          type="button"
          className={`${ROW} text-destructive`}
          onClick={act(() => deleteWorkspace(worktree))}
        >
          <Trash2 className="size-3.5 shrink-0" />
          {translate('auto.components.agentOffice.desk.delete', 'Clear out the desk (delete)…')}
        </button>
      )}
    </div>
  )
}
