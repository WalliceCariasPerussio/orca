import { GREMLIN_PET_ID } from '../pet/pet-models'
import type { OfficeAgent } from './office-agents'
import { bubbleFor } from './office-bubbles'
import { FIGURE_HEIGHT, figureDrawable } from './office-figures'
import { frameAt, type PetSprite } from './office-pet-sprite'
import type { DepthDrawable, OfficeProjection } from './office-scene'
import type { WorldPoint } from './office-walker'
import { deskSeats, type DeskSeat } from './project-floor-layout'
import { getCachedSprite } from './vendor/pixel-agents/webview-ui/src/office/sprites/spriteCache'

export type DeskAgent = { agent: OfficeAgent; seat: DeskSeat; sprite: PetSprite }

const BOB_MS = 450
const BUBBLE_HALF_WIDTH = 5
const BUBBLE_HEIGHT = 13
const BUBBLE_Z = 10_000
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

/** Working and waiting agents move; the rest hold a still frame so a quiet floor costs nothing. */
export function deskAgentDrawables(
  deskAgents: readonly DeskAgent[],
  now: number,
  projection: OfficeProjection
): { drawables: DepthDrawable[]; holdMs: number } {
  const { offsetX, offsetY, zoom } = projection
  const drawables: DepthDrawable[] = []
  let holdMs = Number.POSITIVE_INFINITY
  deskAgents.forEach(({ agent, seat, sprite }, i) => {
    const acted = agent.bucket === 'idle' ? undefined : sprite.states?.[agent.bucket]
    const strip = acted ?? sprite.idle
    const moving = agent.bucket === 'working' || (agent.bucket === 'attention' && acted)
    const shown = moving ? frameAt(strip, now + i * STAGGER_MS) : null
    if (shown) {
      holdMs = Math.min(holdMs, shown.nextInMs)
    }
    const frame = shown?.frame ?? strip[0]
    drawables.push(figureDrawable({ sprite, frame, feet: seat.feet, zY: seat.feet.y, projection }))
    let bob = 0
    if (agent.bucket === 'attention') {
      bob = Math.floor(now / BOB_MS) % 2
      holdMs = Math.min(holdMs, BOB_MS - (now % BOB_MS))
    }
    const bubble = getCachedSprite(bubbleFor(agent.bucket), zoom)
    const x = offsetX + (seat.feet.x - BUBBLE_HALF_WIDTH) * zoom
    const y = offsetY + (seat.feet.y - FIGURE_HEIGHT - BUBBLE_HEIGHT - bob) * zoom
    drawables.push({ zY: BUBBLE_Z, draw: (c) => c.drawImage(bubble, x, y) })
  })
  return { drawables, holdMs }
}

export function deskAgentAt(deskAgents: readonly DeskAgent[], world: WorldPoint): DeskAgent | null {
  return (
    deskAgents.find(({ seat }) => {
      const dx = Math.abs(world.x - seat.feet.x)
      const dy = seat.feet.y - world.y
      return dx <= HIT_HALF_WIDTH && dy >= -2 && dy <= FIGURE_HEIGHT + BUBBLE_HEIGHT
    }) ?? null
  )
}
