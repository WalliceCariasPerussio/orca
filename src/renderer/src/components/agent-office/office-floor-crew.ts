import type { OfficeAgent } from './office-agents'
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

/** Everyone on the floor on screen: who sits at which desk, and which desks are free. */
export class FloorCrew {
  private staff: FloorStaff = EMPTY_STAFF

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
    return staffDrawables(this.staff, now, projection)
  }
}
