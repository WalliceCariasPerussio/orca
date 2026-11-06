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

// Why: two of them rest side by side on the sofa, so one cloud has to move up out of the other's way.
const EVERYONE_THINKS = new Map([
  ['pane-0', 'Editando office-roaming.ts'],
  ['pane-1', 'Posso apagar a pasta dist antes do build?'],
  ['pane-2', 'Pronto! Os testes passaram.'],
  ['pane-3', 'Esperando a próxima tarefa'],
  ['pane-4', 'Rodando pnpm test'],
  ['pane-5', 'Lendo o README do projeto'],
  ['pane-6', 'Preciso da sua senha do npm']
])

export const everyoneThinks = defineFixture({
  width: 960,
  store: { repos: stagedRepos },
  render: () => <StaffedFloor thoughts={EVERYONE_THINKS} />,
  interact: (frame) => waitFor(frame, 'canvas[data-ready]')
})
