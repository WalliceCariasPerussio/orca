import { drawBuildingFrame } from './office-building-frame'
import { ELEVATOR_CAR_SPOT, isElevatorTile } from './office-elevator'
import { planRide } from './office-elevator-ride'
import { floorIndicator, layoutForFloor, rememberFloorId, type OfficeFloor } from './office-floors'
import { FrameLoop, type FrameResult } from './office-frame-loop'
import { frameAt, type PetSprite } from './office-pet-sprite'
import { ELEVATOR_FRONT_TILE } from './office-room-grid'
import {
  buildOfficeScene,
  projectScene,
  tileAtCss,
  type OfficeProjection,
  type OfficeScene
} from './office-scene'
import {
  createWalker,
  isWalking,
  stepWalker,
  tileFeet,
  type TilePoint,
  type Walker
} from './office-walker'
import {
  RECEPTION_ENTRANCE_TILE,
  RECEPTIONIST_BLOCKED,
  RECEPTIONIST_FEET
} from './reception-layout'
import { findPath, isWalkable } from './vendor/pixel-agents/webview-ui/src/office/layout/tileMap'

type Phase = 'free' | 'boarding' | 'aboard' | 'closing' | 'riding' | 'arriving' | 'leaving'
type Animation = 'idle' | 'walkLeft' | 'walkRight'

export type OfficeBuildingSetup = {
  floors: OfficeFloor[]
  floorId: string
  /** First visit: walk in through the lobby door instead of stepping out of the elevator. */
  startAtEntrance: boolean
  avatar: PetSprite
  receptionist: PetSprite | null
  lobbySign: string
  lobbyShort: string
  onPanelChange: (open: boolean) => void
  onFloorChange: (floor: OfficeFloor) => void
}

const DOOR_SPEED = 2.4
const ARRIVAL_PAUSE_MS = 250

function sceneFor(floor: OfficeFloor): OfficeScene {
  return buildOfficeScene(layoutForFloor(floor), floor.number === 0 ? RECEPTIONIST_BLOCKED : [])
}

/** The office you walk through: one floor on screen, the elevator, and you. */
export class OfficeBuilding {
  private floors: OfficeFloor[]
  private floor: OfficeFloor
  private scene: OfficeScene
  private readonly walker: Walker
  private avatar: PetSprite
  private phase: Phase = 'free'
  private boardWhenArrived = false
  private called = false
  private doorOpen = 0
  private doorTarget = 0
  private indicator: string
  private ride: { stops: string[]; index: number; stepMs: number; nextAt: number } | null = null
  private destination: OfficeFloor | null = null
  private arriveAt = 0
  private animation: Animation = 'idle'
  private animationStart = 0
  private canvas: HTMLCanvasElement | null = null
  private widthPx = 1
  private heightPx = 1
  private projection: OfficeProjection | null = null
  private readonly loop = new FrameLoop((dt, now) => this.tick(dt, now))

  constructor(private readonly setup: OfficeBuildingSetup) {
    this.floors = setup.floors
    this.floor = setup.floors.find((f) => f.id === setup.floorId) ?? setup.floors[0]
    this.scene = sceneFor(this.floor)
    this.avatar = setup.avatar
    const entering = setup.startAtEntrance && this.floor.number === 0
    this.walker = createWalker(entering ? RECEPTION_ENTRANCE_TILE : ELEVATOR_FRONT_TILE)
    this.indicator = floorIndicator(this.floor, setup.lobbyShort)
  }

  attach(canvas: HTMLCanvasElement, cssWidth: number, cssHeight: number, ratio: number): void {
    this.canvas = canvas
    this.widthPx = Math.max(1, Math.round(cssWidth * ratio))
    this.heightPx = Math.max(1, Math.round(cssHeight * ratio))
    if (canvas.width !== this.widthPx || canvas.height !== this.heightPx) {
      canvas.width = this.widthPx
      canvas.height = this.heightPx
    }
    this.projection = projectScene(this.scene, this.widthPx, this.heightPx, ratio)
    this.loop.invalidate()
  }

  setFloors(floors: OfficeFloor[]): void {
    this.floors = floors
    const current = floors.find((f) => f.id === this.floor.id)
    if (current) {
      this.floor = current
      if (this.phase === 'free') {
        this.indicator = floorIndicator(current, this.setup.lobbyShort)
      }
    }
    this.loop.invalidate()
  }

  setAvatar(avatar: PetSprite): void {
    this.avatar = avatar
    this.loop.invalidate()
  }

  pointer(cssX: number, cssY: number): void {
    if (!this.projection) {
      return
    }
    const tile = tileAtCss(this.projection, cssX, cssY)
    if (isElevatorTile(tile.col, tile.row)) {
      this.callElevator()
    } else {
      this.walkAlong(this.pathTo(tile))
    }
  }

  step(deltaCol: number, deltaRow: number): void {
    if (this.phase !== 'free' || this.walker.path.length > 1) {
      return
    }
    const from = this.walker.path.at(-1) ?? { col: this.walker.col, row: this.walker.row }
    const next = { col: from.col + deltaCol, row: from.row + deltaRow }
    if (isElevatorTile(next.col, next.row)) {
      this.callElevator()
    } else if (isWalkable(next.col, next.row, this.scene.tileMap, this.scene.blockedTiles)) {
      this.walkAlong([...this.walker.path, next])
    }
  }

  callElevator(): void {
    if (this.phase !== 'free') {
      return
    }
    const front = ELEVATOR_FRONT_TILE
    if (this.walker.col === front.col && this.walker.row === front.row && !isWalking(this.walker)) {
      this.board()
      return
    }
    const path = this.pathTo(front)
    if (path.length > 0) {
      this.walkAlong(path)
      this.boardWhenArrived = true
      this.called = true
    }
  }

  /** Ride to a floor from inside the car; picking the current floor just steps back out. */
  choose(floorId: string): void {
    if (this.phase !== 'aboard') {
      return
    }
    this.setup.onPanelChange(false)
    const destination = this.floors.find((f) => f.id === floorId)
    if (destination && destination.id !== this.floor.id) {
      this.destination = destination
      this.phase = 'closing'
      this.doorTarget = 0
    } else {
      this.phase = 'arriving'
      this.arriveAt = 0
    }
    this.loop.invalidate()
  }

  dispose(): void {
    this.loop.dispose()
  }

  private pathTo(tile: TilePoint): TilePoint[] {
    const { tileMap, blockedTiles } = this.scene
    return findPath(this.walker.col, this.walker.row, tile.col, tile.row, tileMap, blockedTiles)
  }

  private walkAlong(path: TilePoint[]): void {
    if (this.phase !== 'free' || path.length === 0) {
      return
    }
    this.walker.path = path
    this.boardWhenArrived = false
    this.called = false
    this.loop.invalidate()
  }

  private board(): void {
    this.phase = 'boarding'
    this.called = true
    this.doorTarget = 1
    this.loop.invalidate()
  }

  private arrive(now: number): void {
    const target = this.destination
    this.ride = null
    this.destination = null
    if (target) {
      this.floor = target
      this.scene = sceneFor(target)
      const ratio = this.projection?.devicePixelRatio ?? 1
      this.projection = projectScene(this.scene, this.widthPx, this.heightPx, ratio)
      rememberFloorId(target.id)
      this.setup.onFloorChange(target)
    }
    this.indicator = floorIndicator(this.floor, this.setup.lobbyShort)
    this.phase = 'arriving'
    this.arriveAt = now + ARRIVAL_PAUSE_MS
  }

  private advanceElevator(now: number, walking: boolean): void {
    if (this.phase === 'free' && this.boardWhenArrived && !walking) {
      this.boardWhenArrived = false
      this.board()
    } else if (this.phase === 'boarding' && this.doorOpen === 1 && !walking) {
      if (this.walker.y === ELEVATOR_CAR_SPOT.y) {
        this.phase = 'aboard'
        this.called = false
        this.setup.onPanelChange(true)
      } else {
        this.walker.glide = { ...ELEVATOR_CAR_SPOT }
      }
    } else if (this.phase === 'closing' && this.doorOpen === 0 && this.destination) {
      const ride = planRide(this.floors, this.floor, this.destination, this.setup.lobbyShort)
      this.ride = { ...ride, index: 0, nextAt: now }
      this.phase = 'riding'
    } else if (this.phase === 'riding' && this.ride && now >= this.ride.nextAt) {
      if (this.ride.index < this.ride.stops.length) {
        this.indicator = this.ride.stops[this.ride.index++]
        this.ride.nextAt = now + this.ride.stepMs
      } else {
        this.arrive(now)
      }
    } else if (this.phase === 'arriving' && now >= this.arriveAt) {
      this.doorTarget = 1
      if (this.doorOpen === 1 && !walking) {
        this.walker.glide = tileFeet(ELEVATOR_FRONT_TILE)
        this.walker.col = ELEVATOR_FRONT_TILE.col
        this.walker.row = ELEVATOR_FRONT_TILE.row
        this.phase = 'leaving'
      }
    } else if (this.phase === 'leaving' && !walking) {
      this.doorTarget = 0
      this.phase = 'free'
    }
  }

  private tick(dt: number, now: number): FrameResult {
    const doorStep = DOOR_SPEED * dt
    this.doorOpen =
      this.doorOpen < this.doorTarget
        ? Math.min(this.doorTarget, this.doorOpen + doorStep)
        : Math.max(this.doorTarget, this.doorOpen - doorStep)
    stepWalker(this.walker, dt)
    this.advanceElevator(now, isWalking(this.walker))
    const holdMs = this.draw(now)
    const animating =
      isWalking(this.walker) ||
      this.doorOpen !== this.doorTarget ||
      this.boardWhenArrived ||
      (this.phase !== 'free' && this.phase !== 'aboard')
    return { animating, holdMs }
  }

  private draw(now: number): number {
    const context = this.canvas?.getContext('2d')
    if (!this.projection || !context) {
      return Number.POSITIVE_INFINITY
    }
    const walking = isWalking(this.walker)
    const animation = !walking ? 'idle' : this.walker.facing === 'left' ? 'walkLeft' : 'walkRight'
    if (animation !== this.animation) {
      this.animation = animation
      this.animationStart = now
    }
    const you = frameAt(this.avatar[animation], now - this.animationStart)
    const atDesk =
      this.setup.receptionist && this.floor.number === 0
        ? frameAt(this.setup.receptionist.idle, now)
        : null
    drawBuildingFrame(context, {
      scene: this.scene,
      projection: this.projection,
      widthPx: this.widthPx,
      heightPx: this.heightPx,
      sign: this.floor.number === 0 ? this.setup.lobbySign.toUpperCase() : this.floor.name,
      doorOpen: this.doorOpen,
      indicator: this.indicator,
      called: this.called,
      you: { sprite: this.avatar, frame: you.frame, feet: this.walker },
      receptionist:
        atDesk && this.setup.receptionist
          ? { sprite: this.setup.receptionist, frame: atDesk.frame, feet: RECEPTIONIST_FEET }
          : null
    })
    return Math.min(you.nextInMs, atDesk?.nextInMs ?? Number.POSITIVE_INFINITY)
  }
}
