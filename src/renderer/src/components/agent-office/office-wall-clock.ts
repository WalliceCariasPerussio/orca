import type { OfficeProjection } from './office-scene'
import { TILE_SIZE } from './vendor/pixel-agents/webview-ui/src/office/types'

/** Every room hangs its clock on the same wall tile. */
export const WALL_CLOCK = { col: 12, row: 0 }

/** The clock sprite's face, inside its rim: [row, first col, last col] in sprite pixels. */
const FACE_ROWS: readonly (readonly [number, number, number])[] = [
  [13, 6, 9],
  [14, 4, 11],
  [15, 3, 12],
  [16, 3, 12],
  [17, 3, 12],
  [18, 4, 11],
  [19, 6, 9]
]
const CENTER = { x: 7.5, y: 16.5 }
const FACE = '#EDEDED'
const HOUR_HAND = { length: 2.5, color: '#3A3F49' }
const MINUTE_HAND = { length: 3.6, color: '#737E7E' }
const MINUTE_MS = 60_000

export function untilNextMinute(time: number): number {
  return MINUTE_MS - (time % MINUTE_MS)
}

// Why: the sprite paints its hands fixed; wipe the face and draw them at the local time.
export function drawWallClock(
  context: CanvasRenderingContext2D,
  projection: OfficeProjection,
  time: number
): void {
  const { offsetX, offsetY, zoom } = projection
  const originX = offsetX + WALL_CLOCK.col * TILE_SIZE * zoom
  const originY = offsetY + WALL_CLOCK.row * TILE_SIZE * zoom
  const dot = (x: number, y: number): void =>
    context.fillRect(originX + x * zoom, originY + y * zoom, zoom, zoom)
  context.fillStyle = FACE
  for (const [row, first, last] of FACE_ROWS) {
    context.fillRect(originX + first * zoom, originY + row * zoom, (last - first + 1) * zoom, zoom)
  }
  const date = new Date(time)
  const minutes = date.getMinutes() + date.getSeconds() / 60
  const hours = (date.getHours() % 12) + minutes / 60
  const hands = [
    { ...MINUTE_HAND, turn: minutes / 60 },
    { ...HOUR_HAND, turn: hours / 12 }
  ]
  for (const hand of hands) {
    const angle = hand.turn * 2 * Math.PI
    context.fillStyle = hand.color
    for (let step = 0; step <= hand.length; step += 0.5) {
      dot(
        Math.floor(CENTER.x + Math.sin(angle) * step),
        Math.floor(CENTER.y - Math.cos(angle) * step)
      )
    }
  }
}
