import { useCallback, useEffect, useState } from 'react'
import { translate } from '@/i18n/i18n'
import { createBrowserUuid } from '@/lib/browser-uuid'
import { callRuntimeRpc } from '@/runtime/runtime-rpc-client'
import type { TuiAgent } from '../../../../shared/agent-launch/catalog/tui-agent'
import type { DashboardWorkspace } from '../../../../shared/dashboard-snapshot'
import { makePaneKey } from '../../../../shared/workspace-layout/stable-pane-id'
import { hostOf } from './office-agent-launch'

/** The pane of each floor's manager, by floor id: the agent you brief, who dispatches the work. */
export type FloorManagers = Readonly<Record<string, string>>

const MANAGERS_KEY = 'orca.agentOffice.managers'

// Why: who manages a floor is a per-computer choice; storage can fail and the desk just stays free.
function readManagers(): FloorManagers {
  try {
    const raw = window.localStorage.getItem(MANAGERS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return Object.fromEntries(
      Object.entries(typeof parsed === 'object' && parsed ? parsed : {}).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0
      )
    )
  } catch {
    return {}
  }
}

function writeManagers(managers: FloorManagers): void {
  try {
    window.localStorage.setItem(MANAGERS_KEY, JSON.stringify(managers))
  } catch {
    // Keep the manager for this visit even when it cannot be saved.
  }
}

/** Each floor's manager, saved on this computer. */
export function useFloorManagers(): [FloorManagers, (floorId: string, paneKey: string) => void] {
  const [managers, setManagers] = useState(readManagers)
  useEffect(() => writeManagers(managers), [managers])
  const setManager = useCallback((floorId: string, paneKey: string) => {
    setManagers((current) => ({ ...current, [floorId]: paneKey }))
  }, [])
  return [managers, setManager]
}

function rolePrompt(projectName: string): string {
  return translate(
    'auto.components.agentOffice.manager.prompt',
    "You are the manager of the {{value0}} project in Orca. I am the owner: I will tell you what needs to be done, or ask where things stand. For each request, break the work into tasks and hand them to Orca workers through Orca orchestration (load the orchestration skill first, or run `orca skills get orchestration` to read its guide). Use this same workspace for small tasks and new workspaces for independent ones. Follow the workers, answer their questions or bring them to me, and tell me when each task is done. Don't write the code yourself unless I ask. Start by introducing yourself in one line, then wait for my first request.",
    { value0: projectName }
  )
}

/** A pane for a manager about to start, so its desk is held before the agent shows up. */
export function newManagerPane(): string {
  return makePaneKey(createBrowserUuid(), createBrowserUuid())
}

/** The project's main workspace, where its manager works: the main worktree, or its folder. */
export function mainWorkspaceOf(
  workspaces: readonly DashboardWorkspace[],
  floorId: string,
  mainWorktreeId: string | undefined
): DashboardWorkspace | null {
  const onFloor = workspaces.filter((workspace) => workspace.repoId === floorId)
  return (
    onFloor.find((workspace) => workspace.worktreeId === mainWorktreeId) ??
    onFloor.find((workspace) => workspace.workspaceKind === 'folder') ??
    null
  )
}

/** Starts a manager in the project's main workspace on the pane held for it, briefed on its role. */
export async function launchManager(
  workspace: DashboardWorkspace,
  agent: TuiAgent,
  projectName: string,
  paneKey: string
): Promise<void> {
  // Why: a terminal surface keeps the reserved pane as the agent's own, so the office knows it at once.
  await callRuntimeRpc(hostOf(workspace), 'agent.launch', {
    agent,
    target: { kind: 'existing', worktree: `id:${workspace.worktreeId}` },
    prompt: { text: rolePrompt(projectName), delivery: 'submit' },
    paneKey,
    surface: 'terminal',
    presentation: 'background'
  })
}
