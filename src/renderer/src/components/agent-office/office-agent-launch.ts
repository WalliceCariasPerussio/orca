import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { launchAgentBackgroundSession } from '@/lib/launch-agent-background-session'
import { formatAgentTypeLabel } from '../../../../shared/agent-status/presentation/agent-type-label'
import type { TuiAgent } from '../../../../shared/agent-launch/catalog/tui-agent'
import type { DashboardWorkspace } from '../../../../shared/dashboard-snapshot'
import { requestBackgroundTerminalWorktreeMount } from '../terminal/background-terminal-worktree-mount'

// Why: a terminal in a workspace you have not opened has no live preview until its tab mounts;
// mount just that tab behind the office, as Orca does for its own background starts.
export function mountAgentTerminal(worktreeId: string, tabId: string | null | undefined): void {
  if (tabId) {
    requestBackgroundTerminalWorktreeMount({ worktreeId, tabIds: [tabId] })
  }
}

/**
 * Starts an agent in a workspace without leaving the office, the way Orca's automations start
 * theirs: its tab exists from the start and its terminal mounts in the background, so the agent
 * shows up at its desk and its window shows it live. Returns the agent's pane.
 */
export async function launchAgentInWorkspace(
  workspace: DashboardWorkspace,
  agent: TuiAgent,
  options: { prompt?: string; title?: string } = {}
): Promise<string> {
  const result = await launchAgentBackgroundSession({
    agent,
    worktreeId: workspace.worktreeId,
    ...(options.prompt ? { prompt: options.prompt } : {}),
    ...(options.title ? { title: options.title } : {})
  })
  if (!result) {
    throw new Error('agent_office_launch_failed')
  }
  // Why: the agent is yours to keep, not an automation run to retire, and the office follows it
  // through Orca's live status rather than its own output stream.
  result.terminalOwnership?.release()
  result.releaseRuntimeObservers()
  return result.paneKey
}

/** Hires an agent at a desk of the workspace, telling you when it could not start. */
export function hireAgentIn(workspace: DashboardWorkspace, agent: TuiAgent): void {
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
