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
import { deskSeats, type DeskSeat } from './project-floor-layout'
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
}

export const EMPTY_STAFF: FloorStaff = {
  deskCount: 0,
  desks: [],
  helpers: { standing: [], more: [] },
  freeDesks: [],
  plaques: []
}

/** What is under a point: the agent to describe, whose window a click opens, and where to label it. */
export type StaffHit = { agent: OfficeAgent; opens: string; tip: WorldPoint }

export function staffFloor(
  agents: readonly OfficeAgent[],
  floorId: string,
  sprites: ReadonlyMap<string, PetSprite>,
  hireLabel: string
): FloorStaff {
  const atDesks = agents.filter((agent) => agent.floorId === floorId && !agent.parentKey)
  const desks = seatAgents(groupBySector(atDesks), sprites)
  const taken = new Set(seatTileKeys(desks))
  const freeDesks = deskSeats(atDesks.length).filter(
    ({ tile }) => !taken.has(`${tile.col},${tile.row}`)
  )
  const plaques = [
    ...desks.map(({ agent, seat }) => ({
      desk: seat.desk,
      label: agent.worktreeName,
      color: sectorColor(agent.worktreeId)
    })),
    ...freeDesks.map((seat) => ({ desk: seat.desk, label: hireLabel, color: null }))
  ]
  return {
    deskCount: atDesks.length,
    desks,
    helpers: helpersFor(desks, agents, sprites),
    freeDesks,
    plaques
  }
}

/** A free desk under a point, chair included: you walk to its chair to hire. */
export function freeDeskAt(staff: FloorStaff, world: WorldPoint): SpotHit | null {
  const seat = staff.freeDesks.find(({ desk }) => {
    const col = Math.floor(world.x / TILE_SIZE) - desk.col
    const row = Math.floor(world.y / TILE_SIZE) - desk.row
    return col >= 0 && col < 3 && row >= -1 && row < 2
  })
  return seat
    ? { id: 'freeDesk', front: seat.tile, tip: { x: seat.feet.x, y: seat.feet.y - FIGURE_HEIGHT } }
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
