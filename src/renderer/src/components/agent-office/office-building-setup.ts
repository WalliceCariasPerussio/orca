import type { OfficeAgent } from './office-agents'
import type { OfficeFloor } from './office-floors'
import type { PetSprite } from './office-pet-sprite'
import type { OfficeSpotId } from './office-spots'

export type OfficeBuildingSetup = {
  floors: OfficeFloor[]
  floorId: string
  /** First visit: walk in through the lobby door instead of stepping out of the elevator. */
  startAtEntrance: boolean
  avatar: PetSprite
  receptionist: PetSprite | null
  /** Pets the agents wear, by bundled pet id. */
  staffSprites: ReadonlyMap<string, PetSprite>
  lobbySign: string
  lobbyShort: string
  /** Written on each project floor's whiteboard. */
  teamBoardLabel: string
  /** On the plaque of each free desk, where clicking hires an agent. */
  hireLabel: string
  onPanelChange: (open: boolean) => void
  onFloorChange: (floor: OfficeFloor) => void
  /** Opens the window of this pane's agent; a sub-agent without a terminal opens its parent's. */
  onAgentClick: (paneKey: string) => void
  /** You clicked the receptionist, a floor's team board or a free desk, and are walking up to it. */
  onSpotClick: (spot: OfficeSpotId) => void
  /** You clicked a desk's plaque: open its workspace's menu at this CSS point. */
  onSectorClick: (worktreeId: string, at: { left: number; top: number }) => void
}

/** What the pointer rests on and where its label goes, in CSS pixels. */
export type OfficeHover = { left: number; top: number } & (
  | { kind: 'agent'; agent: OfficeAgent; seenAt: number }
  | { kind: 'spot'; spot: OfficeSpotId }
  | { kind: 'sector'; worktreeName: string }
)
