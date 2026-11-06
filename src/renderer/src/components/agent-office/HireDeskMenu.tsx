import { useEffect, useRef } from 'react'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { AgentTypeIcon } from '@/lib/agent-type-icon'
import { formatAgentTypeLabel } from '../../../../shared/agent-status/presentation/agent-type-label'
import type { TuiAgent } from '../../../../shared/agent-launch/catalog/tui-agent'
import type { DashboardWorkspace } from '../../../../shared/dashboard-snapshot'
import { Button } from '../ui/button'
import { launchAgentInWorkspace } from './office-agent-launch'

const ROW =
  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring'
const MAX_WORKSPACES = 8

/** A workspace of this floor and the agents its host can start. */
export type HireChoice = { workspace: DashboardWorkspace; agents: readonly TuiAgent[] }

function launch(workspace: DashboardWorkspace, agent: TuiAgent): void {
  launchAgentInWorkspace(workspace, agent).catch(() => {
    toast.error(
      translate(
        'auto.components.agentOffice.hire.launchFailed',
        'Could not start {{value0}} in {{value1}}.',
        { value0: formatAgentTypeLabel(agent), value1: workspace.worktreeName }
      )
    )
  })
}

/** What a free desk offers: a new workspace, or one more agent in a workspace already on the floor. */
export default function HireDeskMenu({
  anchor,
  choices,
  onNewWorkspace,
  onClose
}: {
  anchor: { left: number; top: number }
  choices: readonly HireChoice[]
  onNewWorkspace: () => void
  onClose: () => void
}): React.JSX.Element {
  const firstRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    firstRef.current?.focus()
  }, [])
  const title = translate('auto.components.agentOffice.hire.desk', 'Free desk')
  return (
    <div
      role="dialog"
      aria-label={title}
      className="absolute z-10 w-72 -translate-x-1/2 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-floating"
      style={{ left: anchor.left, top: anchor.top }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          // Why: the page closes on Escape; here it only steps away from the desk.
          event.preventDefault()
          event.stopPropagation()
          onClose()
        }
      }}
    >
      <div className="flex items-center justify-between gap-2 py-0.5 pr-0.5 pl-2">
        <p className="text-xs font-medium">{title}</p>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={translate('auto.components.agentOffice.reception.desk.close', 'Close')}
          onClick={onClose}
        >
          <X />
        </Button>
      </div>
      <button ref={firstRef} type="button" className={ROW} onClick={onNewWorkspace}>
        <Plus className="size-3.5 shrink-0 text-muted-foreground" />
        {translate('auto.components.agentOffice.reception.desk.newWorkspace', 'New workspace')}
      </button>
      <div className="my-1 border-t border-border" />
      <p className="px-2 py-1 text-xs text-muted-foreground">
        {translate(
          'auto.components.agentOffice.hire.joinWorkspace',
          'Or one more agent in a workspace of this floor:'
        )}
      </p>
      <div className="scrollbar-sleek max-h-56 overflow-y-auto">
        {choices.slice(0, MAX_WORKSPACES).map(({ workspace, agents }) => (
          <div key={workspace.worktreeId} className="flex items-center gap-1 px-2 py-0.5">
            <span className="min-w-0 flex-1 truncate text-sm">{workspace.worktreeName}</span>
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
                  onClick={() => {
                    launch(workspace, agent)
                    onClose()
                  }}
                >
                  <AgentTypeIcon agentType={agent} size={14} />
                </Button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
