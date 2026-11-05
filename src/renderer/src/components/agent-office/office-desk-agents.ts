import { GREMLIN_PET_ID } from '../pet/pet-models'
import { agentBadge } from './office-agent-badges'
import type { OfficeAgent } from './office-agents'
import { bubbleFor } from './office-bubbles'
import { FIGURE_HEIGHT, figureDrawable } from './office-figures'
import { frameAt, type PetSprite } from './office-pet-sprite'
import type { DepthDrawable, OfficeProjection } from './office-scene'
import type { Facing, WorldPoint } from './office-walker'
import { deskSeats, type DeskSeat } from './project-floor-layout'
import { getCachedSprite } from './vendor/pixel-agents/webview-ui/src/office/sprites/spriteCache'

export type DeskAgent = { agent: OfficeAgent; seat: DeskSeat; sprite: PetSprite }

/** Where an agent is this frame: at its desk unless it got up, which way it walks, and how high it hops. */
export type AgentStance = {
  feet: WorldPoint
  walking: Facing | null
  lift: number
  atDesk: boolean
}

export function seatedStance({ seat }: DeskAgent): AgentStance {
  return { feet: seat.feet, walking: null, lift: 0, atDesk: true }
}

const BOB_MS = 450
export const BUBBLE_HALF_WIDTH = 5
const BUBBLE_WIDTH = 11
export const BUBBLE_HEIGHT = 13
/** Bubbles draw over everything in the room. */
export const BUBBLE_Z = 10_000
const STAGGER_MS = 137
const HIT_HALF_WIDTH = 9

export function seatAgents(
  agents: readonly OfficeAgent[],
  sprites: ReadonlyMap<string, PetSprite>
): DeskAgent[] {
  const seats = deskSeats(agents.length)
  // Why: a custom pet still loading, or since deleted, borrows a bundled look instead of leaving the desk empty.
  const standIn = sprites.get(GREMLIN_PET_ID) ?? sprites.values().next().value
  return agents.slice(0, seats.length).flatMap((agent, i) => {
    const sprite = sprites.get(agent.petId) ?? standIn
    return sprite ? [{ agent, seat: seats[i], sprite }] : []
  })
}

export function seatTileKeys(deskAgents: readonly DeskAgent[]): string[] {
  return deskAgents.map(({ seat }) => `${seat.tile.col},${seat.tile.row}`)
}

function stripFor(agent: OfficeAgent, sprite: PetSprite, walking: Facing | null) {
  if (walking) {
    return { strip: walking === 'left' ? sprite.walkLeft : sprite.walkRight, moving: true }
  }
  const acted = agent.bucket === 'idle' ? undefined : sprite.states?.[agent.bucket]
  const moving = agent.bucket === 'working' || (agent.bucket === 'attention' && acted !== undefined)
  return { strip: acted ?? sprite.idle, moving }
}

/** Working, waiting and walking agents move; the rest hold a still frame so a quiet floor costs nothing. */
export function deskAgentDrawables(
  deskAgents: readonly DeskAgent[],
  now: number,
  projection: OfficeProjection,
  stanceOf: (desk: DeskAgent) => AgentStance = seatedStance
): { drawables: DepthDrawable[]; holdMs: number } {
  const { offsetX, offsetY, zoom } = projection
  const drawables: DepthDrawable[] = []
  let holdMs = Number.POSITIVE_INFINITY
  deskAgents.forEach((desk, i) => {
    const { agent, sprite } = desk
    const { feet, walking, lift, atDesk } = stanceOf(desk)
    const { strip, moving } = stripFor(agent, sprite, walking)
    const shown = moving ? frameAt(strip, now + i * STAGGER_MS) : null
    if (shown) {
      holdMs = Math.min(holdMs, shown.nextInMs)
    }
    const frame = shown?.frame ?? strip[0]
    const raised = { x: feet.x, y: feet.y - lift }
    drawables.push(figureDrawable({ sprite, frame, feet: raised, zY: feet.y, projection }))
    let bob = 0
    if (agent.bucket === 'attention') {
      bob = Math.floor(now / BOB_MS) % 2
      holdMs = Math.min(holdMs, BOB_MS - (now % BOB_MS))
    }
    const bubble = getCachedSprite(bubbleFor(agent.bucket), zoom)
    const x = offsetX + (raised.x - BUBBLE_HALF_WIDTH) * zoom
    const y = offsetY + (raised.y - FIGURE_HEIGHT - BUBBLE_HEIGHT - bob) * zoom
    drawables.push({ zY: BUBBLE_Z, draw: (c) => c.drawImage(bubble, x, y) })
    // Why: the kind badge stays with the desk, so bubbles of agents side by side on the sofa do not collide.
    const badge = atDesk ? agentBadge(agent.agentType, zoom) : null
    if (badge) {
      const badgeX = x + (BUBBLE_WIDTH + 1) * zoom
      drawables.push({ zY: BUBBLE_Z, draw: (c) => c.drawImage(badge, badgeX, y) })
    }
  })
  return { drawables, holdMs }
}

export function deskAgentAt(
  deskAgents: readonly DeskAgent[],
  world: WorldPoint,
  stanceOf: (desk: DeskAgent) => AgentStance = seatedStance
): DeskAgent | null {
  return (
    deskAgents.find((desk) => {
      const { feet } = stanceOf(desk)
      const dx = Math.abs(world.x - feet.x)
      const dy = feet.y - world.y
      return dx <= HIT_HALF_WIDTH && dy >= -2 && dy <= FIGURE_HEIGHT + BUBBLE_HEIGHT
    }) ?? null
  )
}
