import { GREMLIN_PET_ID } from '../pet/pet-models'
import type { OfficeAgent } from './office-agents'
import { BUBBLE_FILL, BUBBLE_OUTLINE, bubbleFor } from './office-bubbles'
import { BUBBLE_HALF_WIDTH, BUBBLE_HEIGHT, BUBBLE_Z, type DeskAgent } from './office-desk-agents'
import { figureDrawable } from './office-figures'
import { frameAt, type PetSprite } from './office-pet-sprite'
import { ROOM_ROWS } from './office-room-grid'
import type { DepthDrawable, OfficeProjection } from './office-scene'
import type { WorldPoint } from './office-walker'
import { getCachedSprite } from './vendor/pixel-agents/webview-ui/src/office/sprites/spriteCache'
import { TILE_SIZE } from './vendor/pixel-agents/webview-ui/src/office/types'

/** A sub-agent standing in front of its parent's desk: smaller, and without a desk of its own. */
export type DeskHelper = {
  /** Its own name and state, for the hover label. */
  agent: OfficeAgent
  /** Whose window a click opens: a sub-agent without a terminal works in its parent's. */
  opens: string
  sprite: PetSprite
  feet: WorldPoint
}

/** How many more sub-agents a desk has than stand in front of it. */
type MoreTag = { count: number; at: WorldPoint }

export type DeskHelpers = { standing: DeskHelper[]; more: MoreTag[] }

/** World pixels a sub-agent is tall, against a person's 24. */
export const HELPER_HEIGHT = 15
const MAX_STANDING = 3
const SPACING = 12
/** From the parent's feet, behind the desk, to the sub-agents' feet just in front of it. */
const FRONT_OFFSET = 22
const LOWEST_FEET = ROOM_ROWS * TILE_SIZE - 2
const HIT_HALF_WIDTH = 5
const STAGGER_MS = 211
const TAG_FONT_SIZE = 5

/** Up to three sub-agents in front of each desk, spawned agents first, and a "+N" for the rest. */
export function helpersFor(
  desks: readonly DeskAgent[],
  agents: readonly OfficeAgent[],
  sprites: ReadonlyMap<string, PetSprite>
): DeskHelpers {
  const standing: DeskHelper[] = []
  const more: MoreTag[] = []
  for (const { agent: parent, seat, sprite } of desks) {
    const spawned = agents
      .filter((agent) => agent.parentKey === parent.key)
      .map((child) => ({
        agent: child,
        opens: child.key,
        sprite: sprites.get(child.petId) ?? sprites.get(GREMLIN_PET_ID) ?? sprite
      }))
    // Why: a sub-agent without a terminal is its parent in miniature, which tells the two kinds apart.
    const inside = parent.subagents.map((sub) => ({
      agent: { ...parent, ...sub, parentKey: parent.key, subagents: [] },
      opens: parent.key,
      sprite
    }))
    const crew = [...spawned, ...inside]
    const shown = crew.slice(0, MAX_STANDING)
    const y = Math.min(seat.feet.y + FRONT_OFFSET, LOWEST_FEET)
    const left = seat.feet.x - ((shown.length - 1) / 2) * SPACING
    shown.forEach((member, i) => standing.push({ ...member, feet: { x: left + i * SPACING, y } }))
    if (crew.length > shown.length) {
      more.push({
        count: crew.length - shown.length,
        at: { x: left + shown.length * SPACING - 4, y }
      })
    }
  }
  return { standing, more }
}

export function helperAt(helpers: DeskHelpers, world: WorldPoint): DeskHelper | null {
  return (
    helpers.standing.find(({ feet }) => {
      const dy = feet.y - world.y
      return Math.abs(world.x - feet.x) <= HIT_HALF_WIDTH && dy >= -2 && dy <= HELPER_HEIGHT
    }) ?? null
  )
}

function drawMoreTag(
  context: CanvasRenderingContext2D,
  tag: MoreTag,
  projection: OfficeProjection
): void {
  const { offsetX, offsetY, zoom } = projection
  const text = `+${tag.count}`
  const width = (text.length * 4 + 3) * zoom
  const height = 7 * zoom
  const x = offsetX + tag.at.x * zoom
  const y = offsetY + (tag.at.y - 10) * zoom
  context.fillStyle = BUBBLE_OUTLINE
  context.fillRect(x, y, width, height)
  context.fillStyle = BUBBLE_FILL
  context.fillRect(x + zoom, y + zoom, width - 2 * zoom, height - 2 * zoom)
  context.fillStyle = BUBBLE_OUTLINE
  context.font = `700 ${TAG_FONT_SIZE * zoom}px ui-monospace, "Cascadia Mono", Consolas, monospace`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, x + width / 2, y + height / 2 + zoom / 2)
}

/** Working sub-agents move; one that needs you shows the "!" bubble, the rest stay quiet. */
export function helperDrawables(
  helpers: DeskHelpers,
  now: number,
  projection: OfficeProjection
): { drawables: DepthDrawable[]; holdMs: number } {
  const { offsetX, offsetY, zoom } = projection
  const drawables: DepthDrawable[] = []
  let holdMs = Number.POSITIVE_INFINITY
  helpers.standing.forEach(({ agent, sprite, feet }, i) => {
    const acted = agent.bucket === 'idle' ? undefined : sprite.states?.[agent.bucket]
    const strip = acted ?? sprite.idle
    const moving = agent.bucket === 'working' || (agent.bucket === 'attention' && acted)
    const shown = moving ? frameAt(strip, now + i * STAGGER_MS) : null
    if (shown) {
      holdMs = Math.min(holdMs, shown.nextInMs)
    }
    const frame = shown?.frame ?? strip[0]
    drawables.push(
      figureDrawable({ sprite, frame, feet, zY: feet.y, projection, height: HELPER_HEIGHT })
    )
    if (agent.bucket === 'attention') {
      const bubble = getCachedSprite(bubbleFor('attention'), zoom)
      const x = offsetX + (feet.x - BUBBLE_HALF_WIDTH) * zoom
      const y = offsetY + (feet.y - HELPER_HEIGHT - BUBBLE_HEIGHT) * zoom
      drawables.push({ zY: BUBBLE_Z, draw: (c) => c.drawImage(bubble, x, y) })
    }
  })
  for (const tag of helpers.more) {
    drawables.push({ zY: tag.at.y, draw: (c) => drawMoreTag(c, tag, projection) })
  }
  return { drawables, holdMs }
}
