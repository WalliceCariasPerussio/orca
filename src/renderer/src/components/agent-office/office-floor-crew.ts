import type { OfficeAgent } from './office-agents'
import { Cheers } from './office-cheers'
import { Departures } from './office-departures'
import type { DeskAgent } from './office-desk-agents'
import { FIGURE_HEIGHT } from './office-figures'
import {
  EMPTY_STAFF,
  freeDeskAt,
  staffAt,
  staffDrawables,
  staffFloor,
  staffTiles,
  type FloorStaff,
  type StaffHit
} from './office-floor-staff'
import { layoutForFloor, type OfficeFloor } from './office-floors'
import type { PetSprite } from './office-pet-sprite'
import { Roaming } from './office-roaming'
import {
  buildOfficeScene,
  type DepthDrawable,
  type OfficeProjection,
  type OfficeScene
} from './office-scene'
import { spotAt, type SpotHit } from './office-spots'
import { thinkerNow, thoughtCloud } from './office-thought-clouds'
import { sameThoughts, type OfficeThoughts } from './office-thoughts'
import type { TilePoint, WorldPoint } from './office-walker'
import { RECEPTIONIST_BLOCKED } from './reception-layout'

/** Agents held at their desk because their sub-agents stand there with them. */
function pinnedKeys(agents: readonly OfficeAgent[]): Set<string> {
  return new Set(
    agents.flatMap((agent) => [
      ...(agent.parentKey ? [agent.parentKey] : []),
      ...(agent.subagents.length > 0 ? [agent.key] : [])
    ])
  )
}

/** Everyone on a project floor: who sits at which desk, which desks are free, who cheers and who strolls. */
export class FloorCrew {
  private staff: FloorStaff = EMPTY_STAFF
  private readonly cheers = new Cheers()
  private readonly roaming = new Roaming()
  private readonly departures = new Departures()
  private thoughts: OfficeThoughts = new Map()

  constructor(private readonly hireLabel: string) {}

  /** Builds the room on screen; on a project floor, seats its agents with a desk for each. */
  seat(
    agents: readonly OfficeAgent[],
    floor: OfficeFloor,
    sprites: ReadonlyMap<string, PetSprite>
  ): OfficeScene {
    if (floor.number === 0) {
      this.clear()
      return buildOfficeScene(layoutForFloor(floor, 0), RECEPTIONIST_BLOCKED)
    }
    this.staff = staffFloor(agents, floor.id, sprites, this.hireLabel)
    const layout = layoutForFloor(floor, this.staff.deskCount)
    const scene = buildOfficeScene(layout, staffTiles(this.staff))
    const now = performance.now()
    const leavers = this.roaming.sync(this.staff.desks, pinnedKeys(agents), floor.id, scene, now)
    this.departures.add(leavers, scene)
    return scene
  }

  clear(): void {
    this.staff = EMPTY_STAFF
    this.roaming.clear()
    this.departures.clear()
  }

  /** Returns false when nothing anyone thinks has changed, so the frame can stay as it is. */
  setThoughts(thoughts: OfficeThoughts): boolean {
    if (sameThoughts(this.thoughts, thoughts)) {
      return false
    }
    this.thoughts = thoughts
    return true
  }

  /** Every agent in the building, on any floor, so a finish seen anywhere is not cheered late. */
  notice(agents: readonly OfficeAgent[]): void {
    this.cheers.notice(agents, performance.now())
  }

  /** Moves the floor's people on; true while someone moves on their own and frames must keep coming. */
  tick(dt: number, now: number): boolean {
    const walking = this.roaming.tick(dt, now)
    const leaving = this.departures.tick(dt)
    return this.cheers.active(now) || walking || leaving
  }

  agentAt(world: WorldPoint): StaffHit | null {
    return staffAt(this.staff, world, (desk) => this.roaming.stance(desk))
  }

  /** The tile beside an agent's chair, where you stand to look over its shoulder. */
  deskSide(agentKey: string): TilePoint | null {
    const desk = this.staff.desks.find(({ agent }) => agent.key === agentKey)
    return desk ? { col: desk.seat.tile.col - 1, row: desk.seat.tile.row } : null
  }

  /** Something to click and walk up to: the receptionist, the team board or a free desk. */
  spotAt(inLobby: boolean, world: WorldPoint): SpotHit | null {
    return spotAt(inLobby, world) ?? freeDeskAt(this.staff, world)
  }

  drawables(
    now: number,
    projection: OfficeProjection
  ): { drawables: DepthDrawable[]; holdMs: number } {
    const stanceOf = (desk: DeskAgent) => ({
      ...this.roaming.stance(desk),
      lift: this.cheers.lift(desk.agent.key, now)
    })
    const drawn = staffDrawables(this.staff, now, projection, stanceOf)
    drawn.drawables.push(...this.departures.drawables(now, projection))
    for (const desk of this.staff.desks) {
      const { feet } = this.roaming.stance(desk)
      const confetti = this.cheers.confetti(desk.agent.key, feet, now, projection)
      if (confetti) {
        drawn.drawables.push(confetti)
      }
    }
    const thinkers = this.staff.desks.map((desk) => {
      const { feet, lift } = stanceOf(desk)
      const head = { x: feet.x, y: feet.y - lift - FIGURE_HEIGHT }
      return { key: desk.agent.key, bucket: desk.agent.bucket, head }
    })
    const turn = thinkerNow(thinkers, this.thoughts, now)
    const text = turn.thinker && this.thoughts.get(turn.thinker.key)
    if (turn.thinker && text) {
      drawn.drawables.push(thoughtCloud(text, turn.thinker.head, projection))
    }
    const holdMs = Math.min(drawn.holdMs, this.roaming.wakeInMs(now), turn.holdMs)
    return { ...drawn, holdMs }
  }
}
