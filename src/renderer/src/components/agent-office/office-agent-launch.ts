import { launchAgentBackgroundSession } from '@/lib/launch-agent-background-session'
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
  // Why: the office follows the agent through Orca's live status, not a remote output stream.
  result.releaseRuntimeObservers()
  return result.paneKey
}
