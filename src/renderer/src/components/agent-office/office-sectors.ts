import type { OfficeAgent } from './office-agents'
import {
  SIGN_BORDER,
  SIGN_FILL,
  SIGN_TEXT,
  type DepthDrawable,
  type OfficeProjection
} from './office-scene'
import { toss } from './office-team-draw'
import type { TilePoint } from './office-walker'
import { TILE_SIZE } from './vendor/pixel-agents/webview-ui/src/office/types'

/** What a desk's plaque says, and the color strip of its sector. */
export type DeskPlaque = { desk: TilePoint; label: string; color: string | null }

/** The plaque on a desk's front panel, in world pixels from the desk's corner. */
const PLAQUE = { x: 3, y: 25, width: 42, height: 7 }
const STRIPE_WIDTH = 3
const FONT_SIZE = 5
/** Desks sort at their bottom edge; the plaque sits just in front of its desk. */
const DESK_DEPTH = 2 * TILE_SIZE + 0.6

/** Agents of one workspace side by side, sectors in the order their first agent arrived. */
export function groupBySector(agents: readonly OfficeAgent[]): OfficeAgent[] {
  const sectors = new Map<string, OfficeAgent[]>()
  for (const agent of agents) {
    const sector = sectors.get(agent.worktreeId)
    if (sector) {
      sector.push(agent)
    } else {
      sectors.set(agent.worktreeId, [agent])
    }
  }
  return [...sectors.values()].flat()
}

// Why: a color per workspace tells sectors apart even when their names are cut short.
export function sectorColor(worktreeId: string): string {
  return `hsl(${toss(worktreeId, 360)} 62% 58%)`
}

function fitted(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (context.measureText(text).width <= maxWidth) {
    return text
  }
  let end = text.length - 1
  while (end > 1 && context.measureText(`${text.slice(0, end)}…`).width > maxWidth) {
    end--
  }
  return `${text.slice(0, end)}…`
}

function drawPlaque(
  context: CanvasRenderingContext2D,
  projection: OfficeProjection,
  plaque: DeskPlaque
): void {
  const { offsetX, offsetY, zoom } = projection
  const x = offsetX + (plaque.desk.col * TILE_SIZE + PLAQUE.x) * zoom
  const y = offsetY + (plaque.desk.row * TILE_SIZE + PLAQUE.y) * zoom
  const width = PLAQUE.width * zoom
  const height = PLAQUE.height * zoom
  context.fillStyle = SIGN_BORDER
  context.fillRect(x, y, width, height)
  context.fillStyle = SIGN_FILL
  context.fillRect(x + zoom, y + zoom, width - 2 * zoom, height - 2 * zoom)
  let textX = x + 3 * zoom
  if (plaque.color) {
    context.fillStyle = plaque.color
    context.fillRect(x + zoom, y + zoom, STRIPE_WIDTH * zoom, height - 2 * zoom)
    textX += STRIPE_WIDTH * zoom
  }
  context.fillStyle = SIGN_TEXT
  context.font = `700 ${FONT_SIZE * zoom}px ui-monospace, "Cascadia Mono", Consolas, monospace`
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  const label = fitted(context, plaque.label, x + width - 2 * zoom - textX)
  context.fillText(label, textX, y + height / 2 + zoom / 2)
}

export function plaqueDrawables(
  plaques: readonly DeskPlaque[],
  projection: OfficeProjection
): DepthDrawable[] {
  return plaques.map((plaque) => ({
    zY: plaque.desk.row * TILE_SIZE + DESK_DEPTH,
    draw: (context) => drawPlaque(context, projection, plaque)
  }))
}
