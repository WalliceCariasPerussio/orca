import elevatorFrameUrl from './assets/elevator-frame.png?url'
import { BUBBLE_FILL, BUBBLE_OUTLINE, bubbleFor } from './office-bubbles'
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
/** On the wall left of the frame: the "!" bubble, and under it the floor that needs you. */
const CALLING_BUBBLE = { x: -13, y: 3 }
const CALLING_TAG = { x: -13, y: 17, width: 11, height: 8 }

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

function drawCalling(context: CanvasRenderingContext2D, view: ElevatorView, floor: string): void {
  const z = view.zoom
  const [bx, by] = at(view, CALLING_BUBBLE.x, CALLING_BUBBLE.y)
  context.drawImage(getCachedSprite(bubbleFor('attention'), z), bx, by)
  const [tx, ty] = at(view, CALLING_TAG.x, CALLING_TAG.y)
  const width = CALLING_TAG.width * z
  const height = CALLING_TAG.height * z
  context.fillStyle = BUBBLE_OUTLINE
  context.fillRect(tx, ty, width, height)
  context.fillStyle = BUBBLE_FILL
  context.fillRect(tx + z, ty + z, width - 2 * z, height - 2 * z)
  context.fillStyle = LED_COLOR
  context.font = `700 ${5 * z}px ui-monospace, Consolas, monospace`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(floor, tx + width / 2, ty + height / 2 + z / 2, width - 2 * z)
}

/** Frame, indicator, call light and the two sliding doors; `open` runs from 0 (shut) to 1. */
export function drawElevatorFront(
  context: CanvasRenderingContext2D,
  view: ElevatorView,
  open: number,
  indicator: string,
  called: boolean,
  /** Floor of someone elsewhere who needs you, shown beside the doors; null when nobody does. */
  calling: string | null
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
  if (calling) {
    drawCalling(context, view, calling)
  }
}

/** Whether a world tile belongs to the elevator door or its call button. */
export function isElevatorTile(col: number, row: number): boolean {
  return (
    (col === ELEVATOR_TILE.col || col === ELEVATOR_TILE.col + 1) &&
    (row === ELEVATOR_TILE.row || row === ELEVATOR_TILE.row + 1)
  )
}
