import { untilNap, type OfficeAgent } from './office-agents'
import { Cheers } from './office-cheers'
import { daylightAt, deskLamp } from './office-daylight'
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
  type StaffHit,
  type StaffLabels,
  vacantDeskAt,
  vacantDeskTip
} from './office-floor-staff'
import { layoutForFloor, type OfficeFloor } from './office-floors'
import type { FloorWorkspace } from './office-floor-workspaces'
import type { PetSprite } from './office-pet-sprite'
import { Roaming } from './office-roaming'
import { plaqueAt, plaqueTip } from './office-sectors'
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
import { TILE_SIZE } from './vendor/pixel-agents/webview-ui/src/office/types'

/** What a point on the floor lands on: an agent, a workspace's plaque, or a spot you walk up to. */
export type OfficeTarget =
  | { kind: 'agent'; hit: StaffHit }
  | { kind: 'sector'; worktreeId: string; worktreeName: string; tip: WorldPoint }
  | { kind: 'spot'; spot: SpotHit }

/** Agents held at their desk: sub-agents stand there with them, or they sleep there with their workspace. */
function pinnedKeys(agents: readonly OfficeAgent[]): Set<string> {
  return new Set(
    agents.flatMap((agent) => [
      ...(agent.parentKey ? [agent.parentKey] : []),
      ...(agent.subagents.length > 0 || agent.manager || agent.asleep ? [agent.key] : [])
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
  private workspaces: readonly FloorWorkspace[] = []
  private floorId: string | null = null

  constructor(private readonly labels: StaffLabels) {}

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
    // Why: someone walking out belongs to the floor it left; riding to another one leaves them there.
    if (floor.id !== this.floorId) {
      this.departures.clear()
      this.floorId = floor.id
    }
    this.staff = staffFloor(agents, floor.id, sprites, this.labels, this.workspaces)
    const layout = layoutForFloor(floor, this.staff.deskCount)
    const scene = buildOfficeScene(layout, staffTiles(this.staff))
    const now = performance.now()
    const leavers = this.roaming.sync(this.staff.desks, pinnedKeys(agents), floor.id, scene, now)
    this.departures.add(leavers, scene)
    return scene
  }

  clear(): void {
    this.staff = EMPTY_STAFF
    this.floorId = null
    this.roaming.clear()
    this.departures.clear()
  }

  /** The project's workspaces, so the ones nobody works in still keep a desk; reseat after. */
  setWorkspaces(workspaces: readonly FloorWorkspace[]): void {
    this.workspaces = workspaces
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

  /** The tile beside an agent's chair, where you stand to look over its shoulder. */
  deskSide(agentKey: string): TilePoint | null {
    const desk = this.staff.desks.find(({ agent }) => agent.key === agentKey)
    return desk ? { col: desk.seat.tile.col - 1, row: desk.seat.tile.row } : null
  }

  /** Agents win over the plaques they stand behind, then empty workspace desks; spots are the receptionist, team board and free desks. */
  targetAt(inLobby: boolean, world: WorldPoint): OfficeTarget | null {
    const hit = staffAt(this.staff, world, (desk) => this.roaming.stance(desk))
    if (hit) {
      return { kind: 'agent', hit }
    }
    const plaque = plaqueAt(this.staff.plaques, world)
    if (plaque?.worktreeId) {
      const { worktreeId, label: worktreeName } = plaque
      return { kind: 'sector', worktreeId, worktreeName, tip: plaqueTip(plaque) }
    }
    const vacant = vacantDeskAt(this.staff, world)
    if (vacant) {
      const { worktreeId, name: worktreeName } = vacant.workspace
      return { kind: 'sector', worktreeId, worktreeName, tip: vacantDeskTip(vacant) }
    }
    const spot = spotAt(inLobby, world) ?? freeDeskAt(this.staff, world)
    return spot ? { kind: 'spot', spot } : null
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
    if (daylightAt(Date.now()) === 'night') {
      for (const desk of this.staff.desks) {
        const busy = desk.agent.bucket === 'working' || desk.agent.bucket === 'attention'
        if (busy && this.roaming.stance(desk).atDesk) {
          const { col, row } = desk.seat.desk
          const lamp = { x: (col + 1.5) * TILE_SIZE, y: row * TILE_SIZE + 10 }
          drawn.drawables.push(deskLamp(lamp, projection))
        }
      }
    }
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
    const napMs = Math.min(...this.staff.desks.map(({ agent }) => untilNap(agent, Date.now())))
    const holdMs = Math.min(drawn.holdMs, this.roaming.wakeInMs(now), turn.holdMs, napMs)
    return { ...drawn, holdMs }
  }
}
