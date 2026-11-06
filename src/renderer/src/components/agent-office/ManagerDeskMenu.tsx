import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { AgentTypeIcon } from '@/lib/agent-type-icon'
import { ORCHESTRATION_SKILL_NAME } from '@/lib/agent-feature-skill-names'
import { useActiveProjectSkillRuntime } from '@/hooks/useActiveProjectSkillRuntime'
import {
  GLOBAL_AGENT_SKILL_SOURCE_KINDS,
  useInstalledAgentSkill
} from '@/hooks/useInstalledAgentSkills'
import { formatAgentTypeLabel } from '../../../../shared/agent-status/presentation/agent-type-label'
import type { TuiAgent } from '../../../../shared/agent-launch/catalog/tui-agent'
import type { DashboardWorkspace } from '../../../../shared/dashboard-snapshot'
import { FloatingTerminalOrchestrationDialog } from '../floating-terminal/FloatingTerminalOrchestrationDialog'
import { Button } from '../ui/button'

const ROW =
  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring'

/** The empty manager's desk: who will take your requests and hand them to Orca workers. */
export default function ManagerDeskMenu({
  anchor,
  projectName,
  workspace,
  agents,
  onHire,
  onClose
}: {
  anchor: { left: number; top: number }
  projectName: string
  /** The project's main workspace, where the manager works; null when Orca has none open. */
  workspace: DashboardWorkspace | null
  /** The agents that workspace's host can start. */
  agents: readonly TuiAgent[]
  onHire: (agent: TuiAgent) => void
  onClose: () => void
}): React.JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null)
  const [setupOpen, setSetupOpen] = useState(false)
  const runtime = useActiveProjectSkillRuntime()
  const skill = useInstalledAgentSkill(ORCHESTRATION_SKILL_NAME, {
    enabled: true,
    discoveryTarget: runtime.discoveryTarget,
    sourceKinds: GLOBAL_AGENT_SKILL_SOURCE_KINDS
  })
  useEffect(() => {
    panelRef.current?.querySelector<HTMLButtonElement>('button[data-hire]')?.focus()
  }, [])
  const title = translate('auto.components.agentOffice.manager.title', 'Floor manager')
  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={title}
      className="absolute z-10 w-80 -translate-x-1/2 -translate-y-full rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-floating"
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
      <p className="px-2 pb-1 text-xs text-muted-foreground">
        {translate(
          'auto.components.agentOffice.manager.about',
          'A manager takes your requests, splits them into tasks and hands them to Orca workers through orchestration. Click it later to brief it in its terminal.'
        )}
      </p>
      {!skill.installed && !skill.loading ? (
        <div className="mx-2 my-1 grid gap-1.5 rounded-md border border-border p-2 text-xs">
          <p>
            {translate(
              'auto.components.agentOffice.manager.noSkill',
              "Your agents don't have Orca's orchestration skill yet, which the manager needs."
            )}
          </p>
          <Button variant="outline" size="sm" onClick={() => setSetupOpen(true)}>
            {translate('auto.components.agentOffice.manager.setUp', 'Set up orchestration')}
          </Button>
        </div>
      ) : null}
      {workspace && agents.length > 0 ? (
        <>
          <p className="px-2 pt-1 text-xs text-muted-foreground">
            {translate(
              'auto.components.agentOffice.manager.who',
              'Who manages {{value0}}? It works in {{value1}}.',
              { value0: projectName, value1: workspace.worktreeName }
            )}
          </p>
          {agents.map((agent) => (
            <button
              key={agent}
              type="button"
              data-hire
              className={ROW}
              onClick={() => onHire(agent)}
            >
              <AgentTypeIcon agentType={agent} size={14} />
              {formatAgentTypeLabel(agent)}
            </button>
          ))}
        </>
      ) : (
        <p className="px-2 py-1 text-xs text-muted-foreground">
          {workspace
            ? translate(
                'auto.components.agentOffice.manager.noAgents',
                'No agent was found on the host of {{value0}}.',
                { value0: workspace.worktreeName }
              )
            : translate(
                'auto.components.agentOffice.manager.noWorkspace',
                "This project's main workspace isn't open in Orca."
              )}
        </p>
      )}
      <FloatingTerminalOrchestrationDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onSetupStateChange={() => void skill.refresh()}
      />
    </div>
  )
}
