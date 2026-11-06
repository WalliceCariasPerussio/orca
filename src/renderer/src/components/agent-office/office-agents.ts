import type {
  DashboardBucket,
  DashboardCard,
  DashboardCardDotState,
  DashboardCardReview
} from '../../../../shared/dashboard-snapshot'
import { roleForAgentType, type StaffPets } from './office-staff-pets'

/** A sub-agent working inside its parent's terminal, with no pane of its own. */
export type OfficeSubagent = { key: string; name: string; bucket: DashboardBucket }

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
  /** The workspace it works in; agents of one workspace sit together as a sector. */
  worktreeId: string
  worktreeName: string
  /** The workspace's pull request, when it has one. */
  review?: DashboardCardReview
  startedAt: number
  /** When it entered its current state; 0 when unknown. */
  since: number
  /** Set when its finished turn failed or was stopped, so it neither shows ✓ nor cheers. */
  verdict?: OfficeVerdict
  /** Working, but only keeping an eye on background tasks (Orca's "monitoring"). */
  monitoring?: boolean
  /** The agent at a desk that spawned this one; it then stands by that desk instead of its own. */
  parentKey?: string
  /** Running sub-agents without a terminal, standing by this agent's desk. */
  subagents: OfficeSubagent[]
}

/** How a finished turn ended when it did not end well. */
export type OfficeVerdict = 'failed' | 'interrupted'

export type FloorTally = Record<DashboardBucket, number>

/** An agent idle this long dozes off, so the ones left waiting stand out. */
const NAP_AFTER_MS = 20 * 60_000

/** True once an idle agent has been idle long enough to doze, at a time in epoch milliseconds. */
export function isNapping(agent: OfficeAgent, time: number): boolean {
  return agent.bucket === 'idle' && agent.since > 0 && time - agent.since >= NAP_AFTER_MS
}

/** How long until an idle agent dozes off; Infinity if it never will or already does. */
export function untilNap(agent: OfficeAgent, time: number): number {
  if (agent.bucket !== 'idle' || agent.since <= 0 || isNapping(agent, time)) {
    return Number.POSITIVE_INFINITY
  }
  return agent.since + NAP_AFTER_MS - time
}

const STANDING_BUCKETS: ReadonlySet<DashboardBucket> = new Set(['working', 'attention'])

function subagentBucket(dotState: DashboardCardDotState): DashboardBucket | null {
  switch (dotState) {
    case 'working':
      return 'working'
    case 'blocked':
    case 'waiting':
      return 'attention'
    case 'done':
    case 'idle':
      return null
  }
}

function endedBadly(card: DashboardCard): OfficeVerdict | undefined {
  if (card.bucket !== 'done') {
    return undefined
  }
  return card.verdict === 'failed' || card.verdict === 'interrupted' ? card.verdict : undefined
}

// Why: a worker spawned by a worker stands with the agent at the desk, up the chain.
function rootOf(
  card: DashboardCard,
  byKey: ReadonlyMap<string, DashboardCard>
): string | undefined {
  let parentKey = card.parentPaneKey
  const seen = new Set([card.paneKey])
  while (parentKey && byKey.has(parentKey) && !seen.has(parentKey)) {
    seen.add(parentKey)
    const parent = byKey.get(parentKey)
    if (!parent?.parentPaneKey || !byKey.has(parent.parentPaneKey)) {
      return parentKey
    }
    parentKey = parent.parentPaneKey
  }
  return undefined
}

/** Agents with a terminal; a spawned one whose parent is in the office stands by it while it runs. */
export function officeAgentsFrom(
  cards: readonly DashboardCard[],
  staffPets: StaffPets
): OfficeAgent[] {
  const byKey = new Map(cards.map((card) => [card.paneKey, card]))
  return cards
    .flatMap((card): OfficeAgent[] => {
      const parentKey = rootOf(card, byKey)
      if (parentKey && !STANDING_BUCKETS.has(card.bucket)) {
        return []
      }
      const subagents = (card.subagents ?? []).flatMap((sub): OfficeSubagent[] => {
        const bucket = subagentBucket(sub.dotState)
        return bucket ? [{ key: `${card.paneKey}/${sub.id}`, name: sub.name, bucket }] : []
      })
      return [
        {
          key: card.paneKey,
          // Why: it stands on its parent's floor, so it counts and draws its pet there.
          floorId: (parentKey && byKey.get(parentKey)?.repoId) || card.repoId,
          name: card.conversationName || card.task || card.agentType,
          agentType: card.agentType,
          bucket: card.bucket,
          petId: staffPets[roleForAgentType(card.agentType)],
          worktreeId: card.worktreeId,
          worktreeName: card.worktreeName,
          review: card.review,
          startedAt: card.startedAt,
          since: card.stateChangedAt,
          verdict: endedBadly(card),
          monitoring: card.bucket === 'working' && card.workingMode === 'monitoring',
          parentKey,
          subagents
        }
      ]
    })
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
