import { ELEVATOR_CAR_SPOT } from './office-elevator'
import { planRide } from './office-elevator-ride'
import { floorIndicator, type OfficeFloor } from './office-floors'
import { ELEVATOR_FRONT_TILE } from './office-room-grid'
import { tileFeet, type Walker } from './office-walker'

type Phase = 'free' | 'boarding' | 'aboard' | 'closing' | 'riding' | 'arriving' | 'leaving'

type TripHooks = {
  lobbyShort: string
  onPanelChange: (open: boolean) => void
  /** The car reached `floor`; swap the room before the doors open. */
  onArrive: (floor: OfficeFloor) => void
}

const DOOR_SPEED = 2.4
const ARRIVAL_PAUSE_MS = 250

/** Doors, indicator and the ride between floors, driving the rider through each step. */
export class ElevatorTrip {
  doorOpen = 0
  called = false
  indicator: string
  private phase: Phase = 'free'
  private boardWhenArrived = false
  private doorTarget = 0
  private ride: { stops: string[]; index: number; stepMs: number; nextAt: number } | null = null
  private destinationId: string | null = null
  private arriveAt = 0

  constructor(
    private readonly hooks: TripHooks,
    startFloor: OfficeFloor
  ) {
    this.indicator = floorIndicator(startFloor, hooks.lobbyShort)
  }

  /** True while you are free to walk around. */
  get free(): boolean {
    return this.phase === 'free'
  }

  get animating(): boolean {
    return (
      this.doorOpen !== this.doorTarget ||
      this.boardWhenArrived ||
      (this.phase !== 'free' && this.phase !== 'aboard')
    )
  }

  showFloor(floor: OfficeFloor): void {
    if (this.phase === 'free') {
      this.indicator = floorIndicator(floor, this.hooks.lobbyShort)
    }
  }

  /** You are walking to the doors; open them once you get there. */
  boardOnArrival(): void {
    this.boardWhenArrived = true
    this.called = true
  }

  cancelBoarding(): void {
    this.boardWhenArrived = false
    this.called = false
  }

  board(): void {
    this.phase = 'boarding'
    this.called = true
    this.doorTarget = 1
  }

  /** Returns false when you are not inside the car. */
  choose(floors: OfficeFloor[], current: OfficeFloor, floorId: string): boolean {
    if (this.phase !== 'aboard') {
      return false
    }
    this.hooks.onPanelChange(false)
    const destination = floors.find((f) => f.id === floorId)
    if (destination && destination.id !== current.id) {
      this.destinationId = destination.id
      this.phase = 'closing'
      this.doorTarget = 0
    } else {
      this.phase = 'arriving'
      this.arriveAt = 0
    }
    return true
  }

  tick(dt: number, now: number, rider: Walker, floors: OfficeFloor[], current: OfficeFloor): void {
    const step = DOOR_SPEED * dt
    this.doorOpen =
      this.doorOpen < this.doorTarget
        ? Math.min(this.doorTarget, this.doorOpen + step)
        : Math.max(this.doorTarget, this.doorOpen - step)
    const walking = rider.path.length > 0 || rider.glide !== null
    if (this.phase === 'free' && this.boardWhenArrived && !walking) {
      this.boardWhenArrived = false
      this.board()
    } else if (this.phase === 'boarding' && this.doorOpen === 1 && !walking) {
      if (rider.y === ELEVATOR_CAR_SPOT.y) {
        this.phase = 'aboard'
        this.called = false
        this.hooks.onPanelChange(true)
      } else {
        rider.glide = { ...ELEVATOR_CAR_SPOT }
      }
    } else if (this.phase === 'closing' && this.doorOpen === 0 && this.destinationId) {
      const ride = planRide(floors, current, this.destinationIn(floors), this.hooks.lobbyShort)
      this.ride = { ...ride, index: 0, nextAt: now }
      this.phase = 'riding'
    } else if (this.phase === 'riding' && this.ride && now >= this.ride.nextAt) {
      if (this.ride.index < this.ride.stops.length) {
        this.indicator = this.ride.stops[this.ride.index++]
        this.ride.nextAt = now + this.ride.stepMs
      } else {
        this.finishRide(now, this.destinationIn(floors))
      }
    } else if (this.phase === 'arriving' && now >= this.arriveAt) {
      this.doorTarget = 1
      if (this.doorOpen === 1 && !walking) {
        rider.glide = tileFeet(ELEVATOR_FRONT_TILE)
        rider.col = ELEVATOR_FRONT_TILE.col
        rider.row = ELEVATOR_FRONT_TILE.row
        this.phase = 'leaving'
      }
    } else if (this.phase === 'leaving' && !walking) {
      this.doorTarget = 0
      this.phase = 'free'
    }
  }

  /** The floor being ridden to, or the lobby if its project was removed on the way. */
  private destinationIn(floors: OfficeFloor[]): OfficeFloor {
    return floors.find((f) => f.id === this.destinationId) ?? floors[0]
  }

  private finishRide(now: number, target: OfficeFloor): void {
    this.ride = null
    this.destinationId = null
    this.hooks.onArrive(target)
    this.indicator = floorIndicator(target, this.hooks.lobbyShort)
    this.phase = 'arriving'
    this.arriveAt = now + ARRIVAL_PAUSE_MS
  }
}
