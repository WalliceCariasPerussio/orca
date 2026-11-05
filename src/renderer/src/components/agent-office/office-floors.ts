import type { Repo } from '../../../../shared/repo-types'
import type { OfficeAgent } from './office-agents'
import { createProjectFloorLayout } from './project-floor-layout'
import { createReceptionLayout } from './reception-layout'
import type { OfficeLayout } from './vendor/pixel-agents/webview-ui/src/office/types'

export const LOBBY_FLOOR_ID = 'lobby'
const REMEMBERED_FLOOR_KEY = 'orca.agentOffice.floorId'

export type OfficeFloor = {
  id: string
  /** 0 is the lobby; projects count up from 1 in the sidebar's saved order. */
  number: number
  name: string
  badgeColor?: string
}

export function buildFloors(
  repos: readonly Pick<Repo, 'id' | 'displayName' | 'badgeColor'>[],
  lobbyName: string
): OfficeFloor[] {
  return [
    { id: LOBBY_FLOOR_ID, number: 0, name: lobbyName },
    ...repos.map((repo, i) => ({
      id: repo.id,
      number: i + 1,
      name: repo.displayName,
      badgeColor: repo.badgeColor
    }))
  ]
}

export function layoutForFloor(floor: OfficeFloor, agentCount: number): OfficeLayout {
  return floor.number === 0
    ? createReceptionLayout()
    : createProjectFloorLayout(floor.id, floor.badgeColor, agentCount)
}

/** Agents waiting on you, those on your floor first, then floor by floor from the bottom. */
export function needingYou(
  agents: readonly OfficeAgent[],
  floors: readonly OfficeFloor[],
  currentFloorId: string
): OfficeAgent[] {
  const order = (agent: OfficeAgent): number =>
    agent.floorId === currentFloorId ? -1 : floors.findIndex((floor) => floor.id === agent.floorId)
  return agents
    .filter((agent) => agent.bucket === 'attention')
    .toSorted((a, b) => order(a) - order(b))
}

export function floorIndicator(floor: OfficeFloor, lobbyShort: string): string {
  return floor.number === 0 ? lobbyShort : String(floor.number)
}

/** The nearest other floor where someone waits on you, for the light beside the elevator. */
export function callingFloor(
  agents: readonly OfficeAgent[],
  floors: readonly OfficeFloor[],
  current: OfficeFloor,
  lobbyShort: string
): string | null {
  const waiting = needingYou(agents, floors, current.id).find((a) => a.floorId !== current.id)
  const floor = floors.find((f) => f.id === waiting?.floorId)
  return floor ? floorIndicator(floor, lobbyShort) : null
}

// Why: storage can be blocked or full; the office still opens in the lobby without it.
export function readRememberedFloorId(): string | null {
  try {
    return window.localStorage.getItem(REMEMBERED_FLOOR_KEY)
  } catch {
    return null
  }
}

export function rememberFloorId(id: string): void {
  try {
    window.localStorage.setItem(REMEMBERED_FLOOR_KEY, id)
  } catch {
    // Remembering the floor is a convenience; ignore storage failures.
  }
}
