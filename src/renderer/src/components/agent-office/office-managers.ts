import { useCallback, useEffect, useState } from 'react'
import { translate } from '@/i18n/i18n'
import type { TuiAgent } from '../../../../shared/agent-launch/catalog/tui-agent'
import type { DashboardWorkspace } from '../../../../shared/dashboard-snapshot'
import { launchAgentInWorkspace } from './office-agent-launch'

/** A floor's manager: the pane of the agent you brief, empty while it starts, and when it was hired. */
export type FloorManager = { paneKey: string; hiredAt: number }

/** Each floor's manager, by floor id. */
export type FloorManagers = Readonly<Record<string, FloorManager>>

const MANAGERS_KEY = 'orca.agentOffice.managers'
/** A manager hired this recently is still on its way; its desk does not hire another meanwhile. */
const ARRIVAL_MS = 60_000

function managerOf(value: unknown): FloorManager | null {
  if (typeof value === 'string' && value.length > 0) {
    return { paneKey: value, hiredAt: 0 }
  }
  if (typeof value !== 'object' || !value || !('paneKey' in value)) {
    return null
  }
  const { paneKey } = value
  const hiredAt = 'hiredAt' in value && typeof value.hiredAt === 'number' ? value.hiredAt : 0
  return typeof paneKey === 'string' && paneKey.length > 0 ? { paneKey, hiredAt } : null
}

// Why: who manages a floor is a per-computer choice; storage can fail and the desk just stays free.
function readManagers(): FloorManagers {
  try {
    const raw = window.localStorage.getItem(MANAGERS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    const managers: Record<string, FloorManager> = {}
    for (const [floorId, value] of Object.entries(
      typeof parsed === 'object' && parsed ? parsed : {}
    )) {
      const manager = managerOf(value)
      if (manager) {
        managers[floorId] = manager
      }
    }
    return managers
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

/** Each floor's manager, saved on this computer; a null pane marks one being hired right now. */
export function useFloorManagers(): [
  FloorManagers,
  (floorId: string, paneKey: string | null) => void
] {
  const [managers, setManagers] = useState(readManagers)
  useEffect(() => writeManagers(managers), [managers])
  const setManager = useCallback((floorId: string, paneKey: string | null) => {
    setManagers((current) => ({
      ...current,
      [floorId]: { paneKey: paneKey ?? '', hiredAt: Date.now() }
    }))
  }, [])
  return [managers, setManager]
}

/** True while a manager hired at `hiredAt` may still be starting, at a time in epoch milliseconds. */
export function isManagerArriving(manager: FloorManager | undefined, time: number): boolean {
  return manager !== undefined && time - manager.hiredAt < ARRIVAL_MS
}

function rolePrompt(projectName: string): string {
  return translate(
    'auto.components.agentOffice.manager.prompt',
    "You are the manager of the {{value0}} project in Orca. I am the owner: I will tell you what needs to be done, or ask where things stand. For each request, break the work into tasks and hand them to Orca workers through Orca orchestration (load the orchestration skill first, or run `orca skills get orchestration` to read its guide). Use this same workspace for small tasks and new workspaces for independent ones. Follow the workers, answer their questions or bring them to me, and tell me when each task is done. Don't write the code yourself unless I ask. Start by introducing yourself in one line, then wait for my first request.",
    { value0: projectName }
  )
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

/** Starts a manager in the project's main workspace, briefed on its role; returns its pane. */
export function launchManager(
  workspace: DashboardWorkspace,
  agent: TuiAgent,
  projectName: string
): Promise<string> {
  return launchAgentInWorkspace(workspace, agent, {
    prompt: rolePrompt(projectName),
    title: translate('auto.components.agentOffice.manager.plaque', 'Manager')
  })
}
