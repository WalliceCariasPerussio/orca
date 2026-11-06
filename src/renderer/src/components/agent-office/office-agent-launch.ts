import { callRuntimeRpc } from '@/runtime/runtime-rpc-client'
import type { TuiAgent } from '../../../../shared/agent-launch/catalog/tui-agent'
import type { DashboardWorkspace } from '../../../../shared/dashboard-snapshot'
import { parseExecutionHostId } from '../../../../shared/execution-host'
import type { RuntimeClientTarget } from '../../../../shared/runtime-client-target'

/** The runtime that owns a workspace: this computer's, or the remote Orca host it lives on. */
export function hostOf(workspace: DashboardWorkspace): RuntimeClientTarget {
  const host = parseExecutionHostId(workspace.executionHostId)
  return host?.kind === 'runtime'
    ? { kind: 'environment', environmentId: host.environmentId }
    : { kind: 'local' }
}

// Why: `orca agent launch` runs on the workspace's own host and leaves you where you are, here in the office.
export async function launchAgentInWorkspace(
  workspace: DashboardWorkspace,
  agent: TuiAgent
): Promise<void> {
  await callRuntimeRpc(hostOf(workspace), 'agent.launch', {
    agent,
    target: { kind: 'existing', worktree: `id:${workspace.worktreeId}` },
    presentation: 'background'
  })
}
