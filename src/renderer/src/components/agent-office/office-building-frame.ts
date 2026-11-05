import {
  clipToDoorway,
  drawElevatorCar,
  drawElevatorFront,
  ELEVATOR_CAR_SPOT,
  ELEVATOR_ORIGIN,
  ELEVATOR_Z,
  type ElevatorView
} from './office-elevator'
import { figureDrawable } from './office-figures'
import type { PetFrame, PetSprite } from './office-pet-sprite'
import { ROOM_SIGN } from './office-room-grid'
import {
  drawOfficeScene,
  drawWallSign,
  type DepthDrawable,
  type OfficeProjection,
  type OfficeScene
} from './office-scene'
import type { WorldPoint } from './office-walker'

export type PlacedFigure = { sprite: PetSprite; frame: PetFrame; feet: WorldPoint }

export type BuildingFrame = {
  scene: OfficeScene
  projection: OfficeProjection
  widthPx: number
  heightPx: number
  sign: string
  doorOpen: number
  indicator: string
  called: boolean
  you: PlacedFigure
  receptionist: PlacedFigure | null
  /** Agents at their desks and their bubbles, already placed. */
  staff: DepthDrawable[]
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
      draw: (c) => drawElevatorFront(c, view, frame.doorOpen, frame.indicator, frame.called)
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
  drawOfficeScene(context, frame.scene, projection, frame.widthPx, frame.heightPx, extras)
  drawWallSign(context, projection, { ...ROOM_SIGN, text: frame.sign })
}
