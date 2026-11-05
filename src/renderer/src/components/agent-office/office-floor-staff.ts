import type { OfficeAgent } from './office-agents'
import {
  deskAgentAt,
  deskAgentDrawables,
  seatAgents,
  seatTileKeys,
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
import type { WorldPoint } from './office-walker'

/** Who works on one floor: agents at desks and the sub-agents standing by them. */
export type FloorStaff = {
  /** Agents that want a desk here, seated or not; the floor grows its desks for them. */
  deskCount: number
  desks: DeskAgent[]
  helpers: DeskHelpers
  /** Each desk's plaque: the workspace of the agent at it. */
  plaques: DeskPlaque[]
}

export const EMPTY_STAFF: FloorStaff = {
  deskCount: 0,
  desks: [],
  helpers: { standing: [], more: [] },
  plaques: []
}

/** What is under a point: the agent to describe, whose window a click opens, and where to label it. */
export type StaffHit = { agent: OfficeAgent; opens: string; tip: WorldPoint }

export function staffFloor(
  agents: readonly OfficeAgent[],
  floorId: string,
  sprites: ReadonlyMap<string, PetSprite>
): FloorStaff {
  const atDesks = agents.filter((agent) => agent.floorId === floorId && !agent.parentKey)
  const desks = seatAgents(groupBySector(atDesks), sprites)
  const plaques = desks.map(({ agent, seat }) => ({
    desk: seat.desk,
    label: agent.worktreeName,
    color: sectorColor(agent.worktreeId)
  }))
  return {
    deskCount: atDesks.length,
    desks,
    helpers: helpersFor(desks, agents, sprites),
    plaques
  }
}

export function staffTiles(staff: FloorStaff): string[] {
  return seatTileKeys(staff.desks)
}

// Why: sub-agents stand in front of the desks, so they win a click over the agent behind them.
export function staffAt(staff: FloorStaff, world: WorldPoint): StaffHit | null {
  const helper = helperAt(staff.helpers, world)
  if (helper) {
    const tip = { x: helper.feet.x, y: helper.feet.y - HELPER_HEIGHT - 4 }
    return { agent: helper.agent, opens: helper.opens, tip }
  }
  const desk = deskAgentAt(staff.desks, world)
  if (!desk) {
    return null
  }
  const { feet } = desk.seat
  return {
    agent: desk.agent,
    opens: desk.agent.key,
    tip: { x: feet.x, y: feet.y - FIGURE_HEIGHT - 14 }
  }
}

export function staffDrawables(
  staff: FloorStaff,
  now: number,
  projection: OfficeProjection
): { drawables: DepthDrawable[]; holdMs: number } {
  const desks = deskAgentDrawables(staff.desks, now, projection)
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
