import type { OfficeAgent } from './office-agents'
import type { TilePoint } from './office-walker'

/** What a visit asks of the building. */
export type VisitHost = {
  agents: () => readonly OfficeAgent[]
  floorId: () => string
  /** Out of the elevator, so you can set off. */
  free: () => boolean
  /** Out of the elevator and standing still. */
  idle: () => boolean
  deskSide: (agentKey: string) => TilePoint | null
  /** Sets off for a tile; false when there is no way there or you already stand on it. */
  walkTo: (tile: TilePoint) => boolean
  rideTo: (floorId: string) => void
  open: (agentKey: string) => void
}

/** Takes you to an agent that needs you: the elevator to its floor if needed, up beside its chair, then its window. */
export class AgentVisit {
  private visiting: { key: string; walking: boolean } | null = null

  constructor(private readonly host: VisitHost) {}

  start(agentKey: string): void {
    const agent = this.host.agents().find((a) => a.key === agentKey)
    if (!agent || !this.host.free()) {
      return
    }
    this.visiting = { key: agentKey, walking: false }
    if (agent.floorId !== this.host.floorId()) {
      this.host.rideTo(agent.floorId)
    }
  }

  cancel(): void {
    this.visiting = null
  }

  /** Each frame: once you are out of the elevator and still, walk up to the agent, then open its window. */
  follow(): void {
    const visiting = this.visiting
    if (!visiting || !this.host.idle()) {
      return
    }
    const agent = this.host.agents().find((a) => a.key === visiting.key)
    // Why: an agent spawned by another stands at its parent's desk.
    const side = agent && this.host.deskSide(agent.parentKey ?? agent.key)
    if (side && !visiting.walking && this.host.walkTo(side)) {
      visiting.walking = true
      return
    }
    this.visiting = null
    // Why: if someone answered it meanwhile, you arrive beside it without a window popping up.
    if (agent?.floorId === this.host.floorId() && agent.bucket === 'attention') {
      this.host.open(agent.key)
    }
  }
}
