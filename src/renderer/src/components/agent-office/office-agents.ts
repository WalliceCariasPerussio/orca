import type {
  DashboardBucket,
  DashboardCard,
  DashboardRevealAgentArgs
} from '../../../../shared/dashboard-snapshot'
import { roleForAgentType, type StaffPets } from './office-staff-pets'

/** One agent at work in the office, placed on the floor of its project. */
export type OfficeAgent = {
  key: string
  floorId: string
  name: string
  /** Kind of agent, shown as a small badge since any pet can wear any agent. */
  agentType: string
  bucket: DashboardBucket
  /** Bundled or custom pet id the agent wears. */
  petId: string
  startedAt: number
  reveal: DashboardRevealAgentArgs
}

export type FloorTally = Record<DashboardBucket, number>

/** Main agents only: sub-agents stay with their parent until the office seats them too. */
export function officeAgentsFrom(
  cards: readonly DashboardCard[],
  staffPets: StaffPets
): OfficeAgent[] {
  return cards
    .filter((card) => !card.parentPaneKey)
    .map((card) => ({
      key: card.paneKey,
      floorId: card.repoId,
      name: card.conversationName || card.task || card.agentType,
      agentType: card.agentType,
      bucket: card.bucket,
      petId: staffPets[roleForAgentType(card.agentType)],
      startedAt: card.startedAt,
      reveal: {
        repoId: card.repoId,
        worktreeId: card.worktreeId,
        executionHostId: card.executionHostId,
        tabId: card.tabId,
        leafId: card.leafId
      }
    }))
    .sort((a, b) => a.startedAt - b.startedAt || a.key.localeCompare(b.key))
}

export function tallyByFloor(agents: readonly OfficeAgent[]): Map<string, FloorTally> {
  const tallies = new Map<string, FloorTally>()
  for (const agent of agents) {
    const tally = tallies.get(agent.floorId) ?? { attention: 0, working: 0, done: 0, idle: 0 }
    tally[agent.bucket]++
    tallies.set(agent.floorId, tally)
  }
  return tallies
}
