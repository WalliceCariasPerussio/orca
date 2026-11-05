import { seatedStance, type AgentStance, type DeskAgent } from './office-desk-agents'
import { ELEVATOR_FRONT_TILE } from './office-room-grid'
import type { OfficeScene } from './office-scene'
import { toss } from './office-team-draw'
import {
  createWalker,
  isWalking,
  stepWalker,
  tileFeet,
  type Spot,
  type TilePoint,
  type Walker
} from './office-walker'
import { LOUNGE_SPOTS } from './project-floor-layout'
import { findPath, isWalkable } from './vendor/pixel-agents/webview-ui/src/office/layout/tileMap'

type Span = readonly [min: number, max: number]

/** A finished agent stays at its desk a while first, so its ✓ and its cheer are seen there. */
const LEAVE_AFTER_DONE_MS: Span = [7000, 12000]
const LEAVE_AFTER_IDLE_MS: Span = [3000, 6000]
const PAUSE_MS: Span = [1500, 4000]
const REST_MS: Span = [25000, 60000]
/** On a floor you just walked onto, the first strolls come sooner. */
const FIRST_REST_MS: Span = [6000, 25000]
/** At most this many agents set off at once; walking back to work is never held up. */
const MAX_STROLLING = 2
const RETRY_MS = 700
/** Agents that show up this soon after you walk onto a floor were already there, e.g. still loading. */
const ARRIVAL_GRACE_MS = 2000
const MIN_WAKE_MS = 16

/** How one agent spends the time it is not working, after pixel-agents' wander-and-rest characters. */
type Roam = {
  walker: Walker
  /** At its desk; false while it strolls, rests in the lounge or walks back. */
  seated: boolean
  /** Where it is walking to now. */
  target: Spot | null
  /** True while that walk leads back to its desk. */
  returning: boolean
  /** Where it goes after that, nearest first. */
  route: Spot[]
  /** When a free agent makes its next move; 0 means it has no plan yet. */
  nextAt: number
  /** Its lounge spot, held while it is free. */
  home: Spot | null
  /** Counts its strolls, so each draws a different place. */
  moves: number
}

function placeAt(walker: Walker, spot: Spot): void {
  Object.assign(walker, { ...spot.feet, ...spot.tile, path: [], glide: null })
}

function sameTile(a: TilePoint, b: TilePoint): boolean {
  return a.col === b.col && a.row === b.row
}

function spanOf(span: Span, seed: string): number {
  return span[0] + toss(seed, span[1] - span[0] + 1)
}

/** Agents with nothing to do get up, stroll the floor and rest in the lounge; work calls them back. */
export class Roaming {
  private readonly roams = new Map<string, Roam>()
  private desks: readonly DeskAgent[] = []
  private pinned: ReadonlySet<string> = new Set()
  private floorId: string | null = null
  private arrivedAt = 0
  private scene: OfficeScene | null = null
  private openTiles: TilePoint[] = []

  /** Follows the floor's agents; on a floor just walked onto, the free ones are already resting. */
  sync(
    desks: readonly DeskAgent[],
    pinned: ReadonlySet<string>,
    floorId: string,
    scene: OfficeScene,
    now: number
  ): void {
    if (floorId !== this.floorId) {
      this.roams.clear()
      this.arrivedAt = now
    }
    const arriving = now - this.arrivedAt < ARRIVAL_GRACE_MS
    this.desks = desks
    this.pinned = pinned
    this.floorId = floorId
    this.scene = scene
    this.openTiles = this.openTilesOf(scene)
    const present = new Set(desks.map(({ agent }) => agent.key))
    for (const key of this.roams.keys()) {
      if (!present.has(key)) {
        this.roams.delete(key)
      }
    }
    for (const desk of desks) {
      const roam = this.roams.get(desk.agent.key)
      if (!roam) {
        this.roams.set(desk.agent.key, this.newRoam(desk, arriving, now))
      } else if (roam.seated) {
        // Why: desks shift when an agent leaves the floor.
        placeAt(roam.walker, desk.seat)
      } else if (roam.returning && roam.target && !sameTile(roam.target.tile, desk.seat.tile)) {
        this.go(roam, desk.seat, true)
      }
    }
  }

  clear(): void {
    this.roams.clear()
    this.desks = []
    this.floorId = null
    this.scene = null
  }

  /** Moves everyone a step; true while someone is walking. */
  tick(dt: number, now: number): boolean {
    let walking = false
    for (const desk of this.desks) {
      const roam = this.roams.get(desk.agent.key)
      if (roam) {
        stepWalker(roam.walker, dt)
        this.settle(roam, now)
        this.decide(roam, desk, now)
        walking ||= isWalking(roam.walker)
      }
    }
    return walking
  }

  stance(desk: DeskAgent): AgentStance {
    const roam = this.roams.get(desk.agent.key)
    if (!roam) {
      return seatedStance(desk)
    }
    const { walker, seated } = roam
    return {
      feet: { x: walker.x, y: walker.y },
      walking: isWalking(walker) ? walker.facing : null,
      lift: 0,
      atDesk: seated
    }
  }

  /** How long until someone with nothing to do makes a move, so a still floor wakes up for it. */
  wakeInMs(now: number): number {
    let wake = Number.POSITIVE_INFINITY
    for (const desk of this.desks) {
      const roam = this.roams.get(desk.agent.key)
      if (roam && roam.nextAt > 0 && !roam.target && this.isFree(desk)) {
        wake = Math.min(wake, Math.max(MIN_WAKE_MS, roam.nextAt - now))
      }
    }
    return wake
  }

  private isFree({ agent }: DeskAgent): boolean {
    return (agent.bucket === 'done' || agent.bucket === 'idle') && !this.pinned.has(agent.key)
  }

  private newRoam(desk: DeskAgent, arriving: boolean, now: number): Roam {
    const roam: Roam = {
      walker: createWalker(desk.seat.tile),
      seated: true,
      target: null,
      returning: false,
      route: [],
      nextAt: 0,
      home: null,
      moves: 0
    }
    placeAt(roam.walker, desk.seat)
    const home = arriving && this.isFree(desk) ? this.claimHome() : null
    if (home) {
      placeAt(roam.walker, home)
      Object.assign(roam, {
        seated: false,
        home,
        nextAt: now + spanOf(FIRST_REST_MS, desk.agent.key)
      })
    }
    return roam
  }

  private settle(roam: Roam, now: number): void {
    const { walker, target } = roam
    if (!target || isWalking(walker)) {
      return
    }
    if (walker.x !== target.feet.x || walker.y !== target.feet.y) {
      walker.glide = { ...target.feet }
      return
    }
    roam.target = null
    if (roam.returning) {
      Object.assign(roam, { returning: false, seated: true, nextAt: 0 })
      return
    }
    const seed = `${walker.col},${walker.row}:${roam.moves}`
    roam.nextAt = now + spanOf(roam.route.length > 0 ? PAUSE_MS : REST_MS, seed)
  }

  private decide(roam: Roam, desk: DeskAgent, now: number): void {
    if (!this.isFree(desk)) {
      Object.assign(roam, { route: [], home: null, nextAt: 0 })
      if (!roam.seated && !roam.returning) {
        roam.returning = true
        this.go(roam, desk.seat, true)
      }
      return
    }
    if (roam.target || now < roam.nextAt) {
      return
    }
    if (roam.seated && roam.nextAt === 0) {
      const span = desk.agent.bucket === 'done' ? LEAVE_AFTER_DONE_MS : LEAVE_AFTER_IDLE_MS
      roam.nextAt = now + spanOf(span, `${desk.agent.key}:leave:${roam.moves}`)
      return
    }
    if ([...this.roams.values()].filter((r) => r.target && !r.returning).length >= MAX_STROLLING) {
      roam.nextAt = now + RETRY_MS
      return
    }
    if (roam.route.length === 0) {
      roam.home ??= this.claimHome()
      roam.route = [this.strollSpot(desk.agent.key, roam), ...(roam.home ? [roam.home] : [])]
    }
    const next = roam.route.shift()
    if (next) {
      roam.seated = false
      this.go(roam, next, false)
    }
  }

  private go(roam: Roam, spot: Spot, toDesk: boolean): void {
    const { walker } = roam
    roam.target = spot
    const scene = this.scene
    // Why: mid-step, the new way starts from the tile it is already stepping onto.
    const from = walker.path[0] ?? { col: walker.col, row: walker.row }
    if (!scene || sameTile(from, spot.tile)) {
      walker.path = walker.path.slice(0, 1)
      return
    }
    const blocked = new Set(scene.blockedTiles)
    if (toDesk) {
      blocked.delete(`${spot.tile.col},${spot.tile.row}`)
    }
    const path = findPath(from.col, from.row, spot.tile.col, spot.tile.row, scene.tileMap, blocked)
    if (path.length === 0) {
      placeAt(walker, spot)
      return
    }
    if (walker.path.length > 0) {
      walker.path = [walker.path[0], ...path]
      return
    }
    // Why: from a chair or the sofa, stand up onto the tile before walking off.
    const stand = tileFeet({ col: walker.col, row: walker.row })
    if (walker.x !== stand.x || walker.y !== stand.y) {
      walker.glide = stand
    }
    walker.path = path
  }

  private claimHome(): Spot | null {
    const held = [...this.roams.values()].flatMap(({ home }) => (home ? [home] : []))
    return (
      LOUNGE_SPOTS.find(
        (spot) => this.isOpen(spot.tile) && !held.some((home) => sameTile(home.tile, spot.tile))
      ) ?? null
    )
  }

  private strollSpot(key: string, roam: Roam): Spot {
    const here = { col: roam.walker.col, row: roam.walker.row }
    const tile =
      this.openTiles[toss(`${key}:stroll:${roam.moves++}`, this.openTiles.length)] ?? here
    return { tile, feet: tileFeet(tile) }
  }

  private isOpen(tile: TilePoint): boolean {
    return (
      this.scene !== null &&
      isWalkable(tile.col, tile.row, this.scene.tileMap, this.scene.blockedTiles)
    )
  }

  private openTilesOf(scene: OfficeScene): TilePoint[] {
    const tiles: TilePoint[] = []
    scene.tileMap.forEach((row, rowIndex) =>
      row.forEach((_, col) => {
        const tile = { col, row: rowIndex }
        if (
          rowIndex > 2 &&
          !sameTile(tile, ELEVATOR_FRONT_TILE) &&
          isWalkable(col, rowIndex, scene.tileMap, scene.blockedTiles)
        ) {
          tiles.push(tile)
        }
      })
    )
    return tiles
  }
}
