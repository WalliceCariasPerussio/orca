import { useEffect, useRef } from 'react'
import type { DashboardBucket } from '../../../../shared/dashboard-snapshot'
import type { Repo } from '../../../../shared/repo-types'
import type { OfficeAgent } from './office-agents'
import { OfficeBuilding } from './office-building'
import { buildFloors } from './office-floors'
import { DEFAULT_STAFF_PETS, roleForAgentType } from './office-staff-pets'
import type { OfficeThoughts } from './office-thoughts'
import { useOfficeCast } from './use-office-cast'

// Why: shared by the office's fixtures, which may not import each other.

export const stagedRepos: Repo[] = [
  {
    id: 'www',
    path: 'F:/www',
    displayName: 'www',
    badgeColor: '#6b7280',
    repoIcon: { type: 'emoji', emoji: '🌐' },
    addedAt: 1
  },
  {
    id: 'mesa',
    path: 'F:/MesaLocal',
    displayName: 'MesaLocal',
    badgeColor: '#3b82f6',
    repoIcon: { type: 'lucide', name: 'Gauge' },
    addedAt: 2
  },
  { id: 'banca', path: 'F:/banca', displayName: 'banca', badgeColor: '#16a34a', addedAt: 3 }
]

const STAFF: [string, DashboardBucket, string][] = [
  ['claude', 'working', 'feat/login-social'],
  ['opencode', 'attention', 'fix/cache'],
  ['codex', 'done', 'main'],
  ['claude', 'idle', 'feat/login-social'],
  ['codex', 'working', 'fix/cache'],
  ['gemini', 'working', 'main'],
  ['claude', 'attention', 'fix/cache']
]

export function fakeAgents(): OfficeAgent[] {
  return STAFF.map(([agentType, bucket, worktree], i) => ({
    key: `pane-${i}`,
    floorId: 'mesa',
    name: `${agentType} ${i + 1}`,
    agentType,
    bucket,
    petId: DEFAULT_STAFF_PETS[roleForAgentType(agentType)],
    worktreeId: `wt-${worktree}`,
    worktreeName: worktree,
    startedAt: i,
    since: Date.now() - (i + 1) * 4 * 60_000,
    subagents: []
  }))
}

/** The same agents with some of them in a new state. */
export function agentsWith(changes: Record<string, DashboardBucket>): OfficeAgent[] {
  return fakeAgents().map((agent) => ({ ...agent, bucket: changes[agent.key] ?? agent.bucket }))
}

// Why: live agents come from terminals a fixture cannot start, so this drives the building directly.
export function StaffedFloor({
  agents = fakeAgents(),
  then,
  thenAfterMs = 200,
  visit,
  thoughts
}: {
  agents?: OfficeAgent[]
  /** Agents a moment later, to catch the office reacting to a change. */
  then?: OfficeAgent[]
  /** How much later; past two seconds, a new agent counts as arriving while you watch. */
  thenAfterMs?: number
  /** An agent you set off to, as the "who needs you" button does. */
  visit?: string
  /** What the agents think out loud. */
  thoughts?: OfficeThoughts
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { cast } = useOfficeCast(Object.values(DEFAULT_STAFF_PETS))
  useEffect(() => {
    const canvas = canvasRef.current
    if (!cast || !canvas) {
      return
    }
    const building = new OfficeBuilding({
      floors: buildFloors(stagedRepos, 'Recepção'),
      floorId: 'mesa',
      startAtEntrance: false,
      avatar: cast.avatar,
      receptionist: cast.receptionist,
      staffSprites: cast.staff,
      lobbySign: 'Recepção',
      lobbyShort: 'T',
      teamBoardLabel: 'Equipe',
      hireLabel: 'Vaga',
      onPanelChange: () => {},
      onFloorChange: () => {},
      onAgentClick: () => {},
      onSpotClick: () => {},
      onSectorClick: () => {}
    })
    building.setAgents(agents)
    building.setThoughts(thoughts ?? new Map())
    building.attach(canvas, 960, 600, 1)
    const later = window.setTimeout(() => {
      if (then) {
        building.setAgents(then)
      }
      if (visit) {
        building.visit(visit)
      }
      canvas.dataset.ready = 'true'
    }, thenAfterMs)
    return () => {
      window.clearTimeout(later)
      building.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a scene's agents are fixed
  }, [cast])
  return <canvas ref={canvasRef} style={{ width: 960, height: 600 }} />
}

export async function waitFor(frame: HTMLElement, selector: string): Promise<void> {
  for (let i = 0; i < 80 && !frame.querySelector(selector); i++) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}
