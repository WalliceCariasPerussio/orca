import elevatorFrameUrl from './assets/elevator-frame.png?url'
import { ELEVATOR_TILE } from './office-room-grid'
import { loadImagePixels, spriteFromPixels } from './office-sprite-decoding'
import { getCachedSprite } from './vendor/pixel-agents/webview-ui/src/office/sprites/spriteCache'
import { TILE_SIZE, type SpriteData } from './vendor/pixel-agents/webview-ui/src/office/types'

const FRAME_SIZE = 32
/** Doorway inside the frame sprite, in sprite pixels. */
const DOORWAY = { x: 3, y: 7, width: 20, height: 25 }
const DOOR_TRAVEL = 9
const LED = { x: 8, y: 2, width: 10, height: 3 }
const CALL_LIGHT = { x: 28, y: 15, size: 2 }

const CABIN = '#3b4150'
const CABIN_LIGHT = '#f6e7b8'
const DOOR = '#aeb6c2'
const DOOR_SHINE = '#cdd3dc'
const DOOR_SHADE = '#8a93a0'
const DOOR_SEAM = '#3a3f49'
const LED_COLOR = '#ff5a3c'

/** Z keys that slot the car, a rider and the doors between the back wall and the room. */
export const ELEVATOR_Z = { car: 32.1, rider: 32.2, doors: 32.3 }

export const ELEVATOR_ORIGIN = {
  x: ELEVATOR_TILE.col * TILE_SIZE,
  y: ELEVATOR_TILE.row * TILE_SIZE
}
/** World point between a rider's feet while inside the car. */
export const ELEVATOR_CAR_SPOT = {
  x: ELEVATOR_ORIGIN.x + DOORWAY.x + DOORWAY.width / 2,
  y: ELEVATOR_ORIGIN.y + DOORWAY.y + DOORWAY.height - 1
}

let frameSprite: SpriteData | null = null

export async function loadElevatorSprite(): Promise<void> {
  if (!frameSprite) {
    frameSprite = spriteFromPixels(
      await loadImagePixels(elevatorFrameUrl),
      0,
      0,
      FRAME_SIZE,
      FRAME_SIZE
    )
  }
}

export type ElevatorView = {
  originX: number
  originY: number
  zoom: number
}

function at(view: ElevatorView, x: number, y: number): [number, number] {
  return [view.originX + x * view.zoom, view.originY + y * view.zoom]
}

export function drawElevatorCar(context: CanvasRenderingContext2D, view: ElevatorView): void {
  const [x, y] = at(view, DOORWAY.x, DOORWAY.y)
  context.fillStyle = CABIN
  context.fillRect(x, y, DOORWAY.width * view.zoom, DOORWAY.height * view.zoom)
  context.fillStyle = CABIN_LIGHT
  context.fillRect(x, y, DOORWAY.width * view.zoom, 2 * view.zoom)
}

export function clipToDoorway(context: CanvasRenderingContext2D, view: ElevatorView): void {
  const [x, y] = at(view, DOORWAY.x, DOORWAY.y)
  context.beginPath()
  context.rect(x, y, DOORWAY.width * view.zoom, DOORWAY.height * view.zoom)
  context.clip()
}

function drawDoor(
  context: CanvasRenderingContext2D,
  view: ElevatorView,
  left: number,
  seamOnRight: boolean
): void {
  const half = DOORWAY.width / 2
  const z = view.zoom
  const [x, y] = at(view, left, DOORWAY.y)
  context.fillStyle = DOOR
  context.fillRect(x, y, half * z, DOORWAY.height * z)
  context.fillStyle = DOOR_SHADE
  context.fillRect(x, y, half * z, z)
  context.fillStyle = DOOR_SHINE
  context.fillRect(x + 2 * z, y + z, z, (DOORWAY.height - 1) * z)
  context.fillStyle = DOOR_SEAM
  context.fillRect(seamOnRight ? x + (half - 1) * z : x, y, z, DOORWAY.height * z)
}

/** Frame, indicator, call light and the two sliding doors; `open` runs from 0 (shut) to 1. */
export function drawElevatorFront(
  context: CanvasRenderingContext2D,
  view: ElevatorView,
  open: number,
  indicator: string,
  called: boolean
): void {
  const travel = Math.round(open * DOOR_TRAVEL)
  context.save()
  clipToDoorway(context, view)
  drawDoor(context, view, DOORWAY.x - travel, true)
  drawDoor(context, view, DOORWAY.x + DOORWAY.width / 2 + travel, false)
  context.restore()
  if (frameSprite) {
    context.drawImage(getCachedSprite(frameSprite, view.zoom), view.originX, view.originY)
  }
  if (called) {
    const [lx, ly] = at(view, CALL_LIGHT.x, CALL_LIGHT.y)
    context.fillStyle = LED_COLOR
    context.fillRect(lx, ly, CALL_LIGHT.size * view.zoom, CALL_LIGHT.size * view.zoom)
  }
  const [cx, cy] = at(view, LED.x + LED.width / 2, LED.y + LED.height / 2)
  context.fillStyle = LED_COLOR
  context.font = `700 ${4 * view.zoom}px ui-monospace, Consolas, monospace`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(indicator, cx, cy + view.zoom / 2, LED.width * view.zoom)
}

/** Whether a world tile belongs to the elevator door or its call button. */
export function isElevatorTile(col: number, row: number): boolean {
  return (
    (col === ELEVATOR_TILE.col || col === ELEVATOR_TILE.col + 1) &&
    (row === ELEVATOR_TILE.row || row === ELEVATOR_TILE.row + 1)
  )
}
