import { SIGN_FILL, SIGN_TEXT, type OfficeProjection } from './office-scene'
import type { WorldPoint } from './office-walker'
import { TILE_SIZE } from './vendor/pixel-agents/webview-ui/src/office/types'

/** The calendar on a project floor's wall, left of the team board, in world pixels. */
export const WALL_CALENDAR = { x: TILE_SIZE + 3, y: 10, width: 11, height: 14 }
/** Where you stand to read it. */
export const WALL_CALENDAR_FRONT_TILE = { col: 1, row: 2 }

const BAND_HEIGHT = 5
const BAND_ON = '#D9483B'
const BAND_OFF = '#8A93A3'
const RING = '#3A3F49'
const INK = '#2f3242'
const FONT = 'ui-monospace, "Cascadia Mono", Consolas, monospace'

export function onWallCalendar(world: WorldPoint): boolean {
  const { x, y, width, height } = WALL_CALENDAR
  return world.x >= x && world.x < x + width && world.y >= y && world.y < y + height
}

/** Today's date under a band that counts the project's automations, red while it has any. */
export function drawWallCalendar(
  context: CanvasRenderingContext2D,
  projection: OfficeProjection,
  time: number,
  automations: number
): void {
  const { offsetX, offsetY, zoom } = projection
  const px = (x: number, y: number, w: number, h: number): void =>
    context.fillRect(offsetX + x * zoom, offsetY + y * zoom, w * zoom, h * zoom)
  const { x, y, width, height } = WALL_CALENDAR
  context.fillStyle = SIGN_FILL
  px(x, y, width, height)
  context.fillStyle = SIGN_TEXT
  px(x + 1, y + 1, width - 2, height - 2)
  context.fillStyle = automations > 0 ? BAND_ON : BAND_OFF
  px(x + 1, y + 1, width - 2, BAND_HEIGHT - 1)
  context.fillStyle = RING
  px(x + 3, y - 1, 1, 2)
  px(x + width - 4, y - 1, 1, 2)
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  const middle = offsetX + (x + width / 2) * zoom
  if (automations > 0) {
    context.fillStyle = SIGN_TEXT
    context.font = `700 ${4 * zoom}px ${FONT}`
    context.fillText(String(Math.min(automations, 99)), middle, offsetY + (y + 3) * zoom)
  }
  context.fillStyle = INK
  context.font = `700 ${6 * zoom}px ${FONT}`
  const day = String(new Date(time).getDate())
  context.fillText(day, middle, offsetY + (y + BAND_HEIGHT + 4.5) * zoom, (width - 2) * zoom)
}
