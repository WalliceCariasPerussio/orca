import { onBadgeReady } from './office-agent-badges'
import type { OfficeAgent } from './office-agents'
import { drawBuildingFrame } from './office-building-frame'
import type { OfficeBuildingSetup, OfficeHover } from './office-building-setup'
import { isElevatorTile } from './office-elevator'
import { ElevatorTrip } from './office-elevator-trip'
import { FloorCrew } from './office-floor-crew'
import { floorSignIcon } from './office-floor-icons'
import { callingFloor, rememberFloorId, type OfficeFloor } from './office-floors'
import { FrameLoop, type FrameResult } from './office-frame-loop'
import { frameAt, type PetSprite } from './office-pet-sprite'
import { ELEVATOR_FRONT_TILE } from './office-room-grid'
import {
  cssAtWorld,
  projectScene,
  tileAtCss,
  worldAtCss,
  type OfficeProjection,
  type OfficeScene
} from './office-scene'
import type { OfficeThoughts } from './office-thoughts'
import { AgentVisit } from './office-visit'
import { WalkCycle } from './office-walk-cycle'
import { untilNextMinute } from './office-wall-clock'
import { createWalker, isWalking, stepWalker, type TilePoint, type Walker } from './office-walker'
import { RECEPTION_ENTRANCE_TILE, RECEPTIONIST_FEET } from './reception-layout'
import { findPath, isWalkable } from './vendor/pixel-agents/webview-ui/src/office/layout/tileMap'

/** The office you walk through: one floor on screen, its agents, the elevator, and you. */
export class OfficeBuilding {
  private floors: OfficeFloor[]
  private floor: OfficeFloor
  private scene: OfficeScene
  private readonly walker: Walker
  private avatar: PetSprite
  private readonly trip: ElevatorTrip
  private agents: OfficeAgent[] = []
  private readonly crew: FloorCrew
  private staffSprites: ReadonlyMap<string, PetSprite>

  private readonly cycle = new WalkCycle()
  private readonly visits = new AgentVisit({
    agents: () => this.agents,
    floorId: () => this.floor.id,
    free: () => this.trip.free,
    idle: () => this.trip.free && !isWalking(this.walker),
    deskSide: (key) => this.crew.deskSide(key),
    walkTo: (tile) => {
      const path = this.pathTo(tile)
      this.walkAlong(path)
      return path.length > 0
    },
    rideTo: (floorId) => {
      this.callElevator()
      this.trip.rideTo(floorId)
    },
    open: (key) => this.setup.onAgentClick(key)
  })
  private canvas: HTMLCanvasElement | null = null
  private widthPx = 1
  private heightPx = 1
  private projection: OfficeProjection | null = null
  private readonly loop = new FrameLoop((dt, now) => this.tick(dt, now))
  private readonly stopBadgeUpdates = onBadgeReady(() => this.loop.invalidate())

  constructor(private readonly setup: OfficeBuildingSetup) {
    this.floors = setup.floors
    this.floor = setup.floors.find((f) => f.id === setup.floorId) ?? setup.floors[0]
    this.staffSprites = setup.staffSprites
    this.crew = new FloorCrew(setup.hireLabel)
    this.scene = this.crew.seat(this.agents, this.floor, this.staffSprites)
    this.avatar = setup.avatar
    const entering = setup.startAtEntrance && this.floor.number === 0
    this.walker = createWalker(entering ? RECEPTION_ENTRANCE_TILE : ELEVATOR_FRONT_TILE)
    this.trip = new ElevatorTrip(
      {
        lobbyShort: setup.lobbyShort,
        onPanelChange: setup.onPanelChange,
        onArrive: (floor) => this.enterFloor(floor)
      },
      this.floor
    )
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
      // Why: a renamed or recolored project repaints its walls and sign right away.
      this.seatStaff()
      this.trip.showFloor(current)
    }
    this.loop.invalidate()
  }

  setAvatar(avatar: PetSprite): void {
    this.avatar = avatar
    this.loop.invalidate()
  }

  /** Every agent in the building; each sits on its project's floor. */
  setAgents(agents: OfficeAgent[]): void {
    this.agents = agents
    this.crew.notice(agents)
    this.seatStaff()
    this.loop.invalidate()
  }

  /** What each agent thinks out loud; changes often, so it never reseats anyone. */
  setThoughts(thoughts: OfficeThoughts): void {
    if (this.crew.setThoughts(thoughts)) {
      this.loop.invalidate()
    }
  }

  setStaffSprites(sprites: ReadonlyMap<string, PetSprite>): void {
    this.staffSprites = sprites
    this.seatStaff()
    this.loop.invalidate()
  }

  pointer(cssX: number, cssY: number): void {
    if (!this.projection) {
      return
    }
    this.visits.cancel()
    const world = worldAtCss(this.projection, cssX, cssY)
    const clicked = this.crew.agentAt(world)
    if (clicked) {
      this.setup.onAgentClick(clicked.opens)
      return
    }
    const spot = this.crew.spotAt(this.floor.number === 0, world)
    if (spot) {
      this.walkAlong(this.pathTo(spot.front))
      this.setup.onSpotClick(spot.id)
      return
    }
    const tile = tileAtCss(this.projection, cssX, cssY)
    if (isElevatorTile(tile.col, tile.row)) {
      this.callElevator()
    } else {
      this.walkAlong(this.pathTo(tile))
    }
  }

  hover(cssX: number, cssY: number): OfficeHover | null {
    if (!this.projection) {
      return null
    }
    const world = worldAtCss(this.projection, cssX, cssY)
    const found = this.crew.agentAt(world)
    if (found) {
      const at = cssAtWorld(this.projection, found.tip.x, found.tip.y)
      return { kind: 'agent', agent: found.agent, seenAt: Date.now(), ...at }
    }
    const spot = this.crew.spotAt(this.floor.number === 0, world)
    return spot?.tip
      ? { kind: 'spot', spot: spot.id, ...cssAtWorld(this.projection, spot.tip.x, spot.tip.y) }
      : null
  }

  /** CSS point in front of the reception counter, where its menu opens. */
  receptionistAnchor(): { left: number; top: number } | null {
    if (!this.projection || this.floor.number !== 0) {
      return null
    }
    return cssAtWorld(this.projection, RECEPTIONIST_FEET.x, RECEPTIONIST_FEET.y + 16)
  }

  step(deltaCol: number, deltaRow: number): void {
    if (!this.trip.free || this.walker.path.length > 1) {
      return
    }
    this.visits.cancel()
    const from = this.walker.path.at(-1) ?? { col: this.walker.col, row: this.walker.row }
    const next = { col: from.col + deltaCol, row: from.row + deltaRow }
    if (isElevatorTile(next.col, next.row)) {
      this.callElevator()
    } else if (isWalkable(next.col, next.row, this.scene.tileMap, this.scene.blockedTiles)) {
      this.walkAlong([...this.walker.path, next])
    }
  }

  callElevator(): void {
    if (!this.trip.free) {
      return
    }
    const front = ELEVATOR_FRONT_TILE
    if (this.walker.col === front.col && this.walker.row === front.row && !isWalking(this.walker)) {
      this.trip.board()
    } else {
      const path = this.pathTo(front)
      if (path.length === 0) {
        return
      }
      this.walkAlong(path)
      this.trip.boardOnArrival()
    }
    this.loop.invalidate()
  }

  /** Takes you to an agent: the elevator to its floor if needed, up to its desk, then its window. */
  visit(agentKey: string): void {
    this.visits.start(agentKey)
    this.loop.invalidate()
  }

  /** Ride to a floor from inside the car; picking the current floor just steps back out. */
  choose(floorId: string): void {
    if (this.trip.choose(this.floors, this.floor, floorId)) {
      this.loop.invalidate()
    }
  }

  dispose(): void {
    this.stopBadgeUpdates()
    this.loop.dispose()
  }

  private seatStaff(): void {
    this.scene = this.crew.seat(this.agents, this.floor, this.staffSprites)
    if (this.projection) {
      const ratio = this.projection.devicePixelRatio
      this.projection = projectScene(this.scene, this.widthPx, this.heightPx, ratio)
    }
  }

  private enterFloor(floor: OfficeFloor): void {
    this.floor = floor
    this.seatStaff()
    rememberFloorId(floor.id)
    this.setup.onFloorChange(floor)
  }

  /** Your floor's project is gone: step out of the elevator in the lobby. */
  private leaveRemovedFloor(): void {
    const lobby = this.floors[0]
    this.trip.cancelBoarding()
    Object.assign(this.walker, createWalker(ELEVATOR_FRONT_TILE))
    this.enterFloor(lobby)
    this.trip.showFloor(lobby)
  }

  private pathTo(tile: TilePoint): TilePoint[] {
    const { tileMap, blockedTiles } = this.scene
    return findPath(this.walker.col, this.walker.row, tile.col, tile.row, tileMap, blockedTiles)
  }

  private walkAlong(path: TilePoint[]): void {
    if (!this.trip.free || path.length === 0) {
      return
    }
    this.walker.path = path
    this.trip.cancelBoarding()
    this.loop.invalidate()
  }

  private tick(dt: number, now: number): FrameResult {
    stepWalker(this.walker, dt)
    const crewMoving = this.crew.tick(dt, now)
    this.trip.tick(dt, now, this.walker, this.floors, this.floor)
    if (this.trip.free && !this.floors.includes(this.floor)) {
      this.leaveRemovedFloor()
    }
    this.visits.follow()
    const holdMs = this.draw(now)
    return { animating: isWalking(this.walker) || this.trip.animating || crewMoving, holdMs }
  }

  private draw(now: number): number {
    const context = this.canvas?.getContext('2d')
    if (!this.projection || !context) {
      return Number.POSITIVE_INFINITY
    }
    const you = this.cycle.frame(this.avatar, this.walker, now)
    const receptionist = this.floor.number === 0 ? this.setup.receptionist : null
    const atDesk = receptionist ? frameAt(receptionist.idle, now) : null
    const staff = this.crew.drawables(now, this.projection)
    drawBuildingFrame(context, {
      scene: this.scene,
      projection: this.projection,
      widthPx: this.widthPx,
      heightPx: this.heightPx,
      sign: this.floor.number === 0 ? this.setup.lobbySign.toUpperCase() : this.floor.name,
      signIcon: floorSignIcon(this.floor),
      boardLabel: this.floor.number === 0 ? null : this.setup.teamBoardLabel.toUpperCase(),
      doorOpen: this.trip.doorOpen,
      indicator: this.trip.indicator,
      called: this.trip.called,
      calling: callingFloor(this.agents, this.floors, this.floor, this.setup.lobbyShort),
      you: { sprite: this.avatar, frame: you.frame, feet: this.walker },
      receptionist:
        receptionist && atDesk
          ? { sprite: receptionist, frame: atDesk.frame, feet: RECEPTIONIST_FEET }
          : null,
      staff: staff.drawables,
      time: Date.now()
    })
    const clockMs = untilNextMinute(Date.now())
    return Math.min(
      you.nextInMs,
      atDesk?.nextInMs ?? Number.POSITIVE_INFINITY,
      staff.holdMs,
      clockMs
    )
  }
}
