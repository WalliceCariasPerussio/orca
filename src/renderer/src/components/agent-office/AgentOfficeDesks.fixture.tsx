import { defineFixture } from '../../component-fixtures/component-fixture'
import OfficeHoverTip from './OfficeHoverTip'
import type { FloorWorkspace } from './office-floor-workspaces'
import { fakeAgents, StaffedFloor, stagedRepos, waitFor } from './office-staged-floor'

function workspace(name: string, extra: Partial<FloorWorkspace> = {}): FloorWorkspace {
  return { floorId: 'mesa', worktreeId: `wt-${name}`, name, asleep: false, ...extra }
}

// Why: the staged agents work in main, fix/cache and feat/login-social; the rest have nobody.
const WORKSPACES: FloorWorkspace[] = [
  workspace('main'),
  workspace('fix/cache'),
  workspace('feat/login-social'),
  workspace('urchin', { asleep: true }),
  workspace('runner', { review: { number: 12, state: 'open' } })
]

export const emptyWorkspaceDesks = defineFixture({
  width: 960,
  store: { repos: stagedRepos },
  render: () => <StaffedFloor agents={fakeAgents().slice(0, 4)} workspaces={WORKSPACES} />,
  interact: (frame) => waitFor(frame, 'canvas[data-ready]')
})

// Why: fix/cache was put to sleep; its agents doze at their desks under a moon until woken.
const sleptCache = fakeAgents().map((agent) =>
  agent.worktreeName === 'fix/cache'
    ? { ...agent, bucket: 'idle' as const, asleep: true, since: Date.now() - 2 * 3_600_000 }
    : agent
)

export const sleepingWorkspace = defineFixture({
  width: 960,
  store: { repos: stagedRepos },
  render: () => (
    <StaffedFloor
      agents={sleptCache}
      workspaces={WORKSPACES.map((w) => (w.name === 'fix/cache' ? { ...w, asleep: true } : w))}
    />
  ),
  interact: (frame) => waitFor(frame, 'canvas[data-ready]')
})

export const sleepingHoverTip = defineFixture({
  width: 700,
  render: () => (
    <div className="relative h-40">
      <OfficeHoverTip
        hover={{ kind: 'agent', agent: sleptCache[1], seenAt: Date.now(), left: 350, top: 130 }}
      />
    </div>
  )
})
