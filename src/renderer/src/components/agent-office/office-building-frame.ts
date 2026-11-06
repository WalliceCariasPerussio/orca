import {
  clipToDoorway,
  drawElevatorCar,
  drawElevatorFront,
  ELEVATOR_CAR_SPOT,
  ELEVATOR_ORIGIN,
  ELEVATOR_Z,
  type ElevatorView
} from './office-elevator'
import { daylightAt, drawWindows, nightTint } from './office-daylight'
import { figureDrawable } from './office-figures'
import type { PetFrame, PetSprite } from './office-pet-sprite'
import { ROOM_SIGN } from './office-room-grid'
import {
  drawOfficeScene,
  drawWallSign,
  type DepthDrawable,
  type OfficeProjection,
  type OfficeScene,
  type SignIcon
} from './office-scene'
import type { WorldPoint } from './office-walker'
import { drawWallCalendar } from './office-wall-calendar'
import { drawWallClock } from './office-wall-clock'
import { TEAM_BOARD } from './project-floor-layout'
import { TILE_SIZE } from './vendor/pixel-agents/webview-ui/src/office/types'

export type PlacedFigure = { sprite: PetSprite; frame: PetFrame; feet: WorldPoint }

/** The whiteboard's writing area in world pixels, and the paper and marker colors of its art. */
const BOARD_AREA = {
  x: TEAM_BOARD.col * TILE_SIZE + 5,
  y: TEAM_BOARD.row * TILE_SIZE + 12,
  width: 22,
  height: 9
}
const BOARD_PAPER = '#EFEBE8'
const BOARD_INK = '#5A4F50'
const BOARD_FONT_SIZE = 6

export type BuildingFrame = {
  scene: OfficeScene
  projection: OfficeProjection
  widthPx: number
  heightPx: number
  sign: string
  /** The project's icon before the sign's name. */
  signIcon: SignIcon | null
  /** Written on a project floor's whiteboard so it reads as the team board; null in the lobby. */
  boardLabel: string | null
  doorOpen: number
  indicator: string
  called: boolean
  /** Floor of someone elsewhere who needs you, lit beside the elevator. */
  calling: string | null
  you: PlacedFigure
  receptionist: PlacedFigure | null
  /** Agents at their desks and their bubbles, already placed. */
  staff: DepthDrawable[]
  /** Local time the wall clock shows, in epoch milliseconds. */
  time: number
  /** The project's automations, counted on its floor's wall calendar; null in the lobby. */
  automations: number | null
}

export function drawBuildingFrame(context: CanvasRenderingContext2D, frame: BuildingFrame): void {
  const { projection, you, receptionist } = frame
  const { offsetX, offsetY, zoom } = projection
  const view: ElevatorView = {
    originX: offsetX + ELEVATOR_ORIGIN.x * zoom,
    originY: offsetY + ELEVATOR_ORIGIN.y * zoom,
    zoom
  }
  // Why: inside the car you sort between its back wall and its doors, so closing doors hide you.
  const inCar = you.feet.y <= ELEVATOR_CAR_SPOT.y + 2
  const extras: DepthDrawable[] = [
    { zY: ELEVATOR_Z.car, draw: (c) => drawElevatorCar(c, view) },
    {
      zY: ELEVATOR_Z.doors,
      draw: (c) =>
        drawElevatorFront(c, view, frame.doorOpen, frame.indicator, frame.called, frame.calling)
    },
    figureDrawable({
      ...you,
      zY: inCar ? ELEVATOR_Z.rider : you.feet.y,
      projection,
      clip: inCar ? (c) => clipToDoorway(c, view) : undefined
    }),
    ...frame.staff
  ]
  if (receptionist) {
    extras.push(figureDrawable({ ...receptionist, zY: receptionist.feet.y, projection }))
  }
  const daylight = daylightAt(frame.time)
  if (daylight === 'night') {
    extras.push(nightTint(projection))
  }
  drawOfficeScene(context, frame.scene, projection, frame.widthPx, frame.heightPx, extras)
  drawWindows(context, projection, daylight)
  drawWallSign(context, projection, { ...ROOM_SIGN, text: frame.sign, icon: frame.signIcon })
  drawWallClock(context, projection, frame.time)
  if (frame.automations !== null) {
    drawWallCalendar(context, projection, frame.time, frame.automations)
  }
  if (frame.boardLabel) {
    drawBoardLabel(context, projection, frame.boardLabel)
  }
}

// Why: the board's doodles are wiped and the label written in its marker color, so it stays art.
function drawBoardLabel(
  context: CanvasRenderingContext2D,
  projection: OfficeProjection,
  text: string
): void {
  const { offsetX, offsetY, zoom } = projection
  const x = offsetX + BOARD_AREA.x * zoom
  const y = offsetY + BOARD_AREA.y * zoom
  const width = BOARD_AREA.width * zoom
  const height = BOARD_AREA.height * zoom
  context.fillStyle = BOARD_PAPER
  context.fillRect(x, y, width, height)
  context.fillStyle = BOARD_INK
  context.font = `700 ${BOARD_FONT_SIZE * zoom}px ui-monospace, "Cascadia Mono", Consolas, monospace`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, x + width / 2, y + height / 2 + zoom / 2, width - 2 * zoom)
}
