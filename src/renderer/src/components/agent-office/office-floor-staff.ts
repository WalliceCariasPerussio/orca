import { GREMLIN_PET_ID } from '../pet/pet-models'
import type { OfficeAgent } from './office-agents'
import {
  deskAgentAt,
  deskAgentDrawables,
  seatAgents,
  seatedStance,
  seatTileKeys,
  type AgentStance,
  type DeskAgent
} from './office-desk-agents'
import {
  HELPER_HEIGHT,
  helperAt,
  helperDrawables,
  helpersFor,
  type DeskHelpers
} from './office-desk-helpers'
import { FIGURE_HEIGHT } from './office-figures'
import type { PetSprite } from './office-pet-sprite'
import type { DepthDrawable, OfficeProjection } from './office-scene'
import { groupBySector, plaqueDrawables, sectorColor, type DeskPlaque } from './office-sectors'
import type { SpotHit } from './office-spots'
import type { WorldPoint } from './office-walker'
import { deskSeats, MANAGER_SEAT, type DeskSeat } from './project-floor-layout'
import { TILE_SIZE } from './vendor/pixel-agents/webview-ui/src/office/types'

/** Who works on one floor: agents at desks and the sub-agents standing by them. */
export type FloorStaff = {
  /** Agents that want a desk here, seated or not; the floor grows its desks for them. */
  deskCount: number
  desks: DeskAgent[]
  helpers: DeskHelpers
  /** Desks nobody sits at; clicking one hires an agent for this floor's project. */
  freeDesks: DeskSeat[]
  /** Each desk's plaque: the workspace of the agent at it, or the hiring sign. */
  plaques: DeskPlaque[]
  /** Nobody manages this floor yet; clicking the manager's desk hires one. */
  managerFree: boolean
}

/** What the plaques of free desks and of the manager's desk say. */
export type StaffLabels = { hire: string; manager: string }

/** The manager's plaque stripe, gold to tell the desk apart from the sectors. */
const MANAGER_COLOR = '#d4a300'

export const EMPTY_STAFF: FloorStaff = {
  deskCount: 0,
  desks: [],
  helpers: { standing: [], more: [] },
  freeDesks: [],
  plaques: [],
  managerFree: false
}

/** What is under a point: the agent to describe, whose window a click opens, and where to label it. */
export type StaffHit = { agent: OfficeAgent; opens: string; tip: WorldPoint }

export function staffFloor(
  agents: readonly OfficeAgent[],
  floorId: string,
  sprites: ReadonlyMap<string, PetSprite>,
  labels: StaffLabels
): FloorStaff {
  const onFloor = agents.filter((agent) => agent.floorId === floorId && !agent.parentKey)
  const manager = onFloor.find((agent) => agent.manager)
  const atDesks = onFloor.filter((agent) => agent !== manager)
  const desks = seatAgents(groupBySector(atDesks), sprites)
  const bossSprite = manager
    ? (sprites.get(manager.petId) ?? sprites.get(GREMLIN_PET_ID) ?? sprites.values().next().value)
    : undefined
  if (manager && bossSprite) {
    desks.push({ agent: manager, seat: MANAGER_SEAT, sprite: bossSprite })
  }
  const taken = new Set(seatTileKeys(desks.filter(({ agent }) => agent !== manager)))
  const freeDesks = deskSeats(atDesks.length).filter(
    ({ tile }) => !taken.has(`${tile.col},${tile.row}`)
  )
  const plaques = [
    ...desks.map(({ agent, seat }) => ({
      desk: seat.desk,
      worktreeId: agent.worktreeId,
      label: agent.worktreeName,
      color: sectorColor(agent.worktreeId),
      review: agent.review,
      status: agent.workspaceStatus
    })),
    ...freeDesks.map((seat) => ({ desk: seat.desk, label: labels.hire, color: null })),
    {
      desk: MANAGER_SEAT.desk,
      worktreeId: manager?.worktreeId,
      label: labels.manager,
      color: MANAGER_COLOR
    }
  ]
  return {
    deskCount: atDesks.length,
    desks,
    helpers: helpersFor(desks, agents, sprites),
    freeDesks,
    plaques,
    managerFree: !manager
  }
}

function onDesk({ desk }: DeskSeat, world: WorldPoint): boolean {
  const col = Math.floor(world.x / TILE_SIZE) - desk.col
  const row = Math.floor(world.y / TILE_SIZE) - desk.row
  return col >= 0 && col < 3 && row >= -1 && row < 2
}

function tipOver(seat: DeskSeat): WorldPoint {
  return { x: seat.feet.x, y: seat.feet.y - FIGURE_HEIGHT }
}

/** A free desk under a point, chair included: you walk to its chair to hire. */
export function freeDeskAt(staff: FloorStaff, world: WorldPoint): SpotHit | null {
  const seat = staff.freeDesks.find((free) => onDesk(free, world))
  if (seat) {
    return { id: 'freeDesk', front: seat.tile, tip: tipOver(seat) }
  }
  return staff.managerFree && onDesk(MANAGER_SEAT, world)
    ? { id: 'managerDesk', front: MANAGER_SEAT.tile, tip: tipOver(MANAGER_SEAT) }
    : null
}

export function staffTiles(staff: FloorStaff): string[] {
  return seatTileKeys(staff.desks)
}

// Why: sub-agents stand in front of the desks, so they win a click over the agent behind them.
export function staffAt(
  staff: FloorStaff,
  world: WorldPoint,
  stanceOf: (desk: DeskAgent) => AgentStance = seatedStance
): StaffHit | null {
  const helper = helperAt(staff.helpers, world)
  if (helper) {
    const tip = { x: helper.feet.x, y: helper.feet.y - HELPER_HEIGHT - 4 }
    return { agent: helper.agent, opens: helper.opens, tip }
  }
  const desk = deskAgentAt(staff.desks, world, stanceOf)
  if (!desk) {
    return null
  }
  const { feet } = stanceOf(desk)
  return {
    agent: desk.agent,
    opens: desk.agent.key,
    tip: { x: feet.x, y: feet.y - FIGURE_HEIGHT - 14 }
  }
}

export function staffDrawables(
  staff: FloorStaff,
  now: number,
  projection: OfficeProjection,
  stanceOf: (desk: DeskAgent) => AgentStance = seatedStance
): { drawables: DepthDrawable[]; holdMs: number } {
  const desks = deskAgentDrawables(staff.desks, now, projection, stanceOf)
  const helpers = helperDrawables(staff.helpers, now, projection)
  return {
    drawables: [
      ...desks.drawables,
      ...helpers.drawables,
      ...plaqueDrawables(staff.plaques, projection)
    ],
    holdMs: Math.min(desks.holdMs, helpers.holdMs)
  }
}
