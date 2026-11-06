import { defineFixture } from '../../component-fixtures/component-fixture'
import type { FloorWorkspace } from './office-floor-workspaces'
import { fakeAgents, StaffedFloor, stagedRepos, waitFor } from './office-staged-floor'

function workspace(name: string, extra: Partial<FloorWorkspace> = {}): FloorWorkspace {
  return { floorId: 'mesa', worktreeId: `wt-${name}`, name, ...extra }
}

// Why: the staged agents work in main, fix/cache and feat/login-social; the rest have nobody.
const WORKSPACES: FloorWorkspace[] = [
  workspace('main'),
  workspace('fix/cache'),
  workspace('feat/login-social'),
  workspace('urchin'),
  workspace('runner', { review: { number: 12, state: 'open' } })
]

export const emptyWorkspaceDesks = defineFixture({
  width: 960,
  store: { repos: stagedRepos },
  render: () => <StaffedFloor agents={fakeAgents().slice(0, 4)} workspaces={WORKSPACES} />,
  interact: (frame) => waitFor(frame, 'canvas[data-ready]')
})
