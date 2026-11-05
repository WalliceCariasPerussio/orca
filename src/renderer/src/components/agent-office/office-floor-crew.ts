import type { OfficeAgent } from './office-agents'
import { Cheers } from './office-cheers'
import { seatedStance, type DeskAgent } from './office-desk-agents'
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
import type { PetSprite } from './office-pet-sprite'
import type { DepthDrawable, OfficeProjection } from './office-scene'
import type { SpotHit } from './office-spots'
import type { WorldPoint } from './office-walker'

/** Everyone on the floor on screen: who sits at which desk, which desks are free, and who cheers. */
export class FloorCrew {
  private staff: FloorStaff = EMPTY_STAFF
  private readonly cheers = new Cheers()

  constructor(private readonly hireLabel: string) {}

  /** Agents that want a desk on this floor; the room grows its desks for them. */
  get deskCount(): number {
    return this.staff.deskCount
  }

  seat(
    agents: readonly OfficeAgent[],
    floorId: string,
    sprites: ReadonlyMap<string, PetSprite>
  ): void {
    this.staff = staffFloor(agents, floorId, sprites, this.hireLabel)
  }

  clear(): void {
    this.staff = EMPTY_STAFF
  }

  /** Every agent in the building, on any floor, so a finish seen anywhere is not cheered late. */
  notice(agents: readonly OfficeAgent[]): void {
    this.cheers.notice(agents, performance.now())
  }

  /** True while someone on the floor moves on their own and the frames must keep coming. */
  animating(now: number): boolean {
    return this.cheers.active(now)
  }

  blockedTiles(): string[] {
    return staffTiles(this.staff)
  }

  agentAt(world: WorldPoint): StaffHit | null {
    return staffAt(this.staff, world)
  }

  freeDeskAt(world: WorldPoint): SpotHit | null {
    return freeDeskAt(this.staff, world)
  }

  drawables(
    now: number,
    projection: OfficeProjection
  ): { drawables: DepthDrawable[]; holdMs: number } {
    const stanceOf = (desk: DeskAgent) => ({
      ...seatedStance(desk),
      lift: this.cheers.lift(desk.agent.key, now)
    })
    const drawn = staffDrawables(this.staff, now, projection, stanceOf)
    for (const desk of this.staff.desks) {
      const confetti = this.cheers.confetti(desk.agent.key, desk.seat.feet, now, projection)
      if (confetti) {
        drawn.drawables.push(confetti)
      }
    }
    return drawn
  }
}
