import type { OfficeAgent } from './office-agents'
import { Cheers } from './office-cheers'
import type { DeskAgent } from './office-desk-agents'
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
import type { SpotHit } from './office-spots'
import type { TilePoint, WorldPoint } from './office-walker'

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

  constructor(private readonly hireLabel: string) {}

  /** Seats the floor's agents and builds its room, with a desk for each of them. */
  seat(
    agents: readonly OfficeAgent[],
    floor: OfficeFloor,
    sprites: ReadonlyMap<string, PetSprite>
  ): OfficeScene {
    this.staff = staffFloor(agents, floor.id, sprites, this.hireLabel)
    const layout = layoutForFloor(floor, this.staff.deskCount)
    const scene = buildOfficeScene(layout, staffTiles(this.staff))
    this.roaming.sync(this.staff.desks, pinnedKeys(agents), floor.id, scene, performance.now())
    return scene
  }

  clear(): void {
    this.staff = EMPTY_STAFF
    this.roaming.clear()
  }

  /** Every agent in the building, on any floor, so a finish seen anywhere is not cheered late. */
  notice(agents: readonly OfficeAgent[]): void {
    this.cheers.notice(agents, performance.now())
  }

  /** Moves the floor's people on; true while someone moves on their own and frames must keep coming. */
  tick(dt: number, now: number): boolean {
    const walking = this.roaming.tick(dt, now)
    return this.cheers.active(now) || walking
  }

  agentAt(world: WorldPoint): StaffHit | null {
    return staffAt(this.staff, world, (desk) => this.roaming.stance(desk))
  }

  /** The tile beside an agent's chair, where you stand to look over its shoulder. */
  deskSide(agentKey: string): TilePoint | null {
    const desk = this.staff.desks.find(({ agent }) => agent.key === agentKey)
    return desk ? { col: desk.seat.tile.col - 1, row: desk.seat.tile.row } : null
  }

  freeDeskAt(world: WorldPoint): SpotHit | null {
    return freeDeskAt(this.staff, world)
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
    for (const desk of this.staff.desks) {
      const { feet } = this.roaming.stance(desk)
      const confetti = this.cheers.confetti(desk.agent.key, feet, now, projection)
      if (confetti) {
        drawn.drawables.push(confetti)
      }
    }
    return { ...drawn, holdMs: Math.min(drawn.holdMs, this.roaming.wakeInMs(now)) }
  }
}
