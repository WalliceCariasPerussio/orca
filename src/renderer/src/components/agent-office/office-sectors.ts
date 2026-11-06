import type { DashboardCardReview } from '../../../../shared/dashboard-snapshot'
import type { OfficeAgent } from './office-agents'
import {
  SIGN_BORDER,
  SIGN_FILL,
  SIGN_TEXT,
  type DepthDrawable,
  type OfficeProjection
} from './office-scene'
import { toss } from './office-team-draw'
import { statusNoteDrawable, type OfficeWorkspaceStatus } from './office-status-notes'
import type { TilePoint, WorldPoint } from './office-walker'
import { TILE_SIZE } from './vendor/pixel-agents/webview-ui/src/office/types'

/** What a desk's plaque says, the color strip of its sector, and its workspace's pull request. */
export type DeskPlaque = {
  desk: TilePoint
  /** The workspace whose menu clicking the plaque opens; unset on a free desk. */
  worktreeId?: string
  label: string
  color: string | null
  review?: DashboardCardReview
  /** The workspace's column on Orca's board, shown as a sticky note on the desk. */
  status?: OfficeWorkspaceStatus
  /** Nothing runs in the workspace, as Orca's moon says; its plaque dims like a desk lamp off. */
  asleep?: boolean
}

/** The plaque on a desk's front panel, in world pixels from the desk's corner. */
const PLAQUE = { x: 3, y: 25, width: 42, height: 7 }
const STRIPE_WIDTH = 3
/** GitHub's colors for a pull request that is open, a draft, merged or closed. */
const REVIEW_COLORS: Record<DashboardCardReview['state'], string> = {
  open: '#3fb950',
  draft: '#8b949e',
  merged: '#a371f7',
  closed: '#f85149'
}
const FONT_SIZE = 5
const ASLEEP_ALPHA = 0.5
/** Desks sort at their bottom edge; the plaque sits just in front of its desk. */
const DESK_DEPTH = 2 * TILE_SIZE + 0.6

/** The plaque of a seated workspace under a world point, if any. */
export function plaqueAt(plaques: readonly DeskPlaque[], world: WorldPoint): DeskPlaque | null {
  return (
    plaques.find(({ desk, worktreeId }) => {
      const x = world.x - (desk.col * TILE_SIZE + PLAQUE.x)
      const y = world.y - (desk.row * TILE_SIZE + PLAQUE.y)
      return worktreeId && x >= 0 && x < PLAQUE.width && y >= 0 && y < PLAQUE.height
    }) ?? null
  )
}

/** Where a plaque's hover label points: just above its middle. */
export function plaqueTip({ desk }: DeskPlaque): WorldPoint {
  return {
    x: desk.col * TILE_SIZE + PLAQUE.x + PLAQUE.width / 2,
    y: desk.row * TILE_SIZE + PLAQUE.y
  }
}

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
  context.save()
  context.globalAlpha = plaque.asleep ? ASLEEP_ALPHA : 1
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
  context.font = `700 ${FONT_SIZE * zoom}px ui-monospace, "Cascadia Mono", Consolas, monospace`
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  const middle = y + height / 2 + zoom / 2
  let right = x + width - 2 * zoom
  if (plaque.review) {
    const tag = `#${plaque.review.number}`
    right -= context.measureText(tag).width
    context.fillStyle = REVIEW_COLORS[plaque.review.state]
    context.fillText(tag, right, middle)
    right -= zoom
  }
  context.fillStyle = SIGN_TEXT
  context.fillText(fitted(context, plaque.label, right - textX), textX, middle)
  context.restore()
}

export function plaqueDrawables(
  plaques: readonly DeskPlaque[],
  projection: OfficeProjection
): DepthDrawable[] {
  return plaques.flatMap((plaque) => [
    {
      zY: plaque.desk.row * TILE_SIZE + DESK_DEPTH,
      draw: (context: CanvasRenderingContext2D) => drawPlaque(context, projection, plaque)
    },
    ...(plaque.status ? [statusNoteDrawable(plaque.desk, plaque.status, projection)] : [])
  ])
}
