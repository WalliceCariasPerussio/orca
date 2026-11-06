import { getWorkspaceStatusVisualMeta } from '../sidebar/workspace-status/presentation/workspace-status'
import type { DepthDrawable, OfficeProjection } from './office-scene'
import type { TilePoint } from './office-walker'
import { TILE_SIZE } from './vendor/pixel-agents/webview-ui/src/office/types'

/** A workspace's column on Orca's workspace board, as the snapshot names it. */
export type OfficeWorkspaceStatus = { id: string; label: string; color?: string }

/** The sticky note on a desk's top, in world pixels from the desk's corner. */
const NOTE = { x: 4, y: 12, side: 7 }
/** Keeps light colors, like the board's "Done", apart from the wooden desk. */
const NOTE_EDGE = '#3b2a2066'
const NOTE_FOLD = '#00000040'
/** Desks sort at their bottom edge; the note lies on the desk, under the plaque. */
const NOTE_DEPTH = 2 * TILE_SIZE + 0.5

const inks = new Map<string, string>()

// Why: the board's colors are Tailwind classes; a probe reads the color the app's own stylesheet gives one.
function swatchInk(swatchClass: string): string {
  const cached = inks.get(swatchClass)
  if (cached) {
    return cached
  }
  const probe = document.createElement('span')
  probe.className = swatchClass
  probe.style.display = 'none'
  document.body.append(probe)
  const ink = getComputedStyle(probe).backgroundColor || '#8a93a3'
  probe.remove()
  inks.set(swatchClass, ink)
  return ink
}

export function statusInk(status: OfficeWorkspaceStatus): string {
  return swatchInk(getWorkspaceStatusVisualMeta(status).swatch)
}

/** A sticky note in the status's board color on the desk of each agent of that workspace. */
export function statusNoteDrawable(
  desk: TilePoint,
  status: OfficeWorkspaceStatus,
  projection: OfficeProjection
): DepthDrawable {
  const { offsetX, offsetY, zoom } = projection
  const x = offsetX + (desk.col * TILE_SIZE + NOTE.x) * zoom
  const y = offsetY + (desk.row * TILE_SIZE + NOTE.y) * zoom
  const side = NOTE.side * zoom
  return {
    zY: desk.row * TILE_SIZE + NOTE_DEPTH,
    draw: (context) => {
      context.fillStyle = NOTE_EDGE
      context.fillRect(x, y, side, side)
      context.fillStyle = statusInk(status)
      context.fillRect(x + zoom, y + zoom, side - 2 * zoom, side - 2 * zoom)
      context.fillStyle = NOTE_FOLD
      context.fillRect(x + side - 3 * zoom, y + side - 2 * zoom, 2 * zoom, zoom)
      context.fillRect(x + side - 2 * zoom, y + side - 3 * zoom, zoom, zoom)
    }
  }
}
