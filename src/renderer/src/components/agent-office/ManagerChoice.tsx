import { translate } from '@/i18n/i18n'
import { AgentTypeIcon } from '@/lib/agent-type-icon'
import { ORCHESTRATION_SKILL_NAME } from '@/lib/agent-feature-skill-names'
import {
  GLOBAL_AGENT_SKILL_SOURCE_KINDS,
  useInstalledAgentSkill
} from '@/hooks/useInstalledAgentSkills'
import { formatAgentTypeLabel } from '../../../../shared/agent-status/presentation/agent-type-label'
import type { TuiAgent } from '../../../../shared/agent-launch/catalog/tui-agent'
import type { SkillDiscoveryTarget } from '../../../../shared/skills'
import { Button } from '../ui/button'

const ROW =
  'flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'

/** One agent that could manage the floor; one without Orca's orchestration skill cannot be hired. */
export default function ManagerChoice({
  agent,
  checkable,
  discoveryTarget,
  onHire,
  onSetUp
}: {
  agent: TuiAgent
  /** True when the skill check looks at the host the manager runs on, so its answer holds. */
  checkable: boolean
  discoveryTarget: SkillDiscoveryTarget | undefined
  onHire: () => void
  onSetUp: () => void
}): React.JSX.Element {
  const skill = useInstalledAgentSkill(ORCHESTRATION_SKILL_NAME, {
    enabled: checkable,
    agent,
    discoveryTarget,
    sourceKinds: GLOBAL_AGENT_SKILL_SOURCE_KINDS
  })
  const missing =
    checkable && skill.settled && !skill.loading && !skill.installed && !skill.installedUnverifiable
  return (
    <div className="flex items-center gap-1">
      <button type="button" data-hire disabled={missing} className={ROW} onClick={onHire}>
        <AgentTypeIcon agentType={agent} size={14} />
        <span className="min-w-0 flex-1 truncate">{formatAgentTypeLabel(agent)}</span>
        {missing ? (
          <span className="text-xs text-muted-foreground">
            {translate(
              'auto.components.agentOffice.manager.noSkillShort',
              'no orchestration skill'
            )}
          </span>
        ) : null}
      </button>
      {missing ? (
        <Button variant="outline" size="xs" onClick={onSetUp}>
          {translate('auto.components.agentOffice.manager.setUp', 'Set up orchestration')}
        </Button>
      ) : null}
    </div>
  )
}
