import { defineFixture } from '../../component-fixtures/component-fixture'
import { makeAutomation } from '../automations/automations-page-fixtures'
import type { DashboardCardReview } from '../../../../shared/dashboard-snapshot'
import HireDeskMenu, { type HireChoice } from './HireDeskMenu'
import OfficeHoverTip from './OfficeHoverTip'
import { agentsWith, fakeAgents, StaffedFloor, stagedRepos, waitFor } from './office-staged-floor'

const TURN_MS = 6000
const NOW = Date.now()
const MINUTE = 60_000

const thoughts = new Map([
  ['pane-0', 'Editando office-roaming.ts'],
  ['pane-1', 'Posso apagar a pasta dist antes de rodar o build de produção?'],
  ['pane-4', 'Rodando pnpm test'],
  ['pane-2', 'Pronto! Os testes passaram e o PR está aberto.']
])

// Why: thoughts take turns on the clock; wait for a moment when a cloud is up.
async function untilCloud(): Promise<void> {
  const into = performance.now() % TURN_MS
  if (into > 3500) {
    await new Promise((resolve) => setTimeout(resolve, TURN_MS - into + 400))
  }
}

export const thinking = defineFixture({
  width: 960,
  store: { repos: stagedRepos },
  render: () => <StaffedFloor thoughts={thoughts} />,
  interact: async (frame) => {
    await waitFor(frame, 'canvas[data-ready]')
    await untilCloud()
  }
})

export const hoverTip = defineFixture({
  width: 700,
  render: () => (
    <div className="relative h-40">
      <OfficeHoverTip
        hover={{ kind: 'agent', agent: fakeAgents()[1], seenAt: NOW, left: 350, top: 130 }}
        thought="Posso apagar a pasta dist antes de rodar o build de produção?"
      />
    </div>
  )
})

export const endedBadly = defineFixture({
  width: 960,
  store: { repos: stagedRepos },
  render: () => (
    <StaffedFloor
      agents={agentsWith({ 'pane-0': 'working', 'pane-4': 'working' })}
      then={agentsWith({ 'pane-0': 'done', 'pane-4': 'done' }).map((agent) =>
        agent.key === 'pane-0'
          ? { ...agent, verdict: 'failed' as const }
          : agent.key === 'pane-4'
            ? { ...agent, verdict: 'interrupted' as const }
            : agent
      )}
    />
  ),
  interact: async (frame) => {
    await waitFor(frame, 'canvas[data-ready]')
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
})

const REVIEWS = new Map<string, DashboardCardReview>([
  ['feat/login-social', { number: 42, state: 'open' }],
  ['fix/cache', { number: 1337, state: 'merged' }]
])

export const reviews = defineFixture({
  width: 960,
  store: { repos: stagedRepos },
  render: () => (
    <StaffedFloor
      agents={fakeAgents().map((agent) => {
        const review = REVIEWS.get(agent.worktreeName)
        return review ? { ...agent, review } : agent
      })}
    />
  ),
  interact: (frame) => waitFor(frame, 'canvas[data-ready]')
})

export const comesAndGoes = defineFixture({
  width: 960,
  store: { repos: stagedRepos },
  render: () => (
    <StaffedFloor
      agents={fakeAgents().filter((agent) => agent.key !== 'pane-6')}
      then={fakeAgents().filter((agent) => agent.key !== 'pane-0')}
      thenAfterMs={2300}
    />
  ),
  interact: async (frame) => {
    await waitFor(frame, 'canvas[data-ready]')
    await new Promise((resolve) => setTimeout(resolve, 1100))
  }
})

export const monitoring = defineFixture({
  width: 960,
  store: { repos: stagedRepos },
  render: () => (
    <StaffedFloor
      agents={fakeAgents().map((agent) =>
        agent.key === 'pane-0' || agent.key === 'pane-5' ? { ...agent, monitoring: true } : agent
      )}
      thoughts={new Map([['pane-0', 'De olho nas tarefas em segundo plano…']])}
    />
  ),
  interact: async (frame) => {
    await waitFor(frame, 'canvas[data-ready]')
    await untilCloud()
  }
})

const REMOTE_HOSTS = new Map([
  ['pane-1', 'SSH host · build-box'],
  ['pane-4', 'SSH host · build-box'],
  ['pane-5', 'Remote Orca host · notebook']
])

export const remoteHosts = defineFixture({
  width: 960,
  store: { repos: stagedRepos },
  render: () => (
    <StaffedFloor
      agents={fakeAgents().map((agent) => ({ ...agent, remoteHost: REMOTE_HOSTS.get(agent.key) }))}
    />
  ),
  interact: async (frame) => {
    await waitFor(frame, 'canvas[data-ready]')
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
})

export const remoteHostTip = defineFixture({
  width: 700,
  render: () => (
    <div className="relative h-56">
      <OfficeHoverTip
        hover={{
          kind: 'agent',
          agent: { ...fakeAgents()[4], remoteHost: 'SSH host · build-box' },
          seenAt: NOW,
          left: 350,
          top: 200
        }}
        thought="Rodando pnpm test"
        model="gpt-5.5-codex"
        asked="Roda os testes do cache e me fala se algum quebrou depois da mudança no TTL."
        status={{
          paneKey: 'pane-4',
          state: 'working',
          prompt: '',
          updatedAt: NOW,
          stateStartedAt: NOW - 20 * MINUTE,
          stateHistory: [
            { state: 'working', prompt: '', startedAt: NOW - 50 * MINUTE },
            { state: 'waiting', prompt: '', startedAt: NOW - 38 * MINUTE },
            { state: 'working', prompt: '', startedAt: NOW - 33 * MINUTE },
            { state: 'done', prompt: '', startedAt: NOW - 26 * MINUTE }
          ]
        }}
      />
    </div>
  )
})

const BOARD_STATUSES = new Map([
  ['feat/login-social', { id: 'in-progress', label: 'Em andamento', color: 'conductor-progress' }],
  ['fix/cache', { id: 'in-review', label: 'Em revisão', color: 'conductor-review' }],
  ['main', { id: 'completed', label: 'Pronto', color: 'conductor-done' }]
])

export const workspaceStatuses = defineFixture({
  width: 960,
  store: { repos: stagedRepos },
  render: () => (
    <StaffedFloor
      agents={fakeAgents().map((agent) => ({
        ...agent,
        workspaceStatus: BOARD_STATUSES.get(agent.worktreeName)
      }))}
    />
  ),
  interact: (frame) => waitFor(frame, 'canvas[data-ready]')
})

export const sectorTip = defineFixture({
  width: 700,
  render: () => (
    <div className="relative h-32">
      <OfficeHoverTip hover={{ kind: 'sector', worktreeName: 'fix/cache', left: 350, top: 100 }} />
    </div>
  )
})

const workspaceOf = (worktreeName: string): HireChoice['workspace'] => ({
  repoId: 'mesa',
  worktreeId: `wt-${worktreeName}`,
  repoName: 'MesaLocal',
  worktreeName,
  hostKind: 'local',
  executionHostId: 'local',
  workspaceKind: 'worktree'
})

const HIRE_CHOICES: HireChoice[] = [
  { workspace: workspaceOf('feat/login-social'), agents: ['claude', 'codex', 'opencode'] },
  { workspace: workspaceOf('fix/cache'), agents: ['claude', 'codex'] },
  { workspace: workspaceOf('main'), agents: ['claude', 'codex', 'gemini'] }
]

export const hireMenu = defineFixture({
  width: 700,
  render: () => (
    <div className="relative h-80">
      <HireDeskMenu
        anchor={{ left: 350, top: 20 }}
        choices={HIRE_CHOICES}
        onNewWorkspace={() => {}}
        onClose={() => {}}
      />
    </div>
  )
})

export const wallCalendar = defineFixture({
  width: 960,
  store: { repos: stagedRepos },
  render: () => <StaffedFloor automations={3} />,
  interact: (frame) => waitFor(frame, 'canvas[data-ready]')
})

const HOUR = 60 * 60_000

const AUTOMATIONS = [
  makeAutomation({ id: 'a1', name: 'Testes da madrugada', nextRunAt: NOW + 7 * HOUR }),
  makeAutomation({ id: 'a2', name: 'Resumo dos PRs', nextRunAt: NOW + 2 * HOUR }),
  makeAutomation({ id: 'a3', name: 'Atualizar dependências', enabled: false })
]

export const automationsTip = defineFixture({
  width: 700,
  render: () => (
    <div className="relative h-48">
      <OfficeHoverTip
        hover={{ kind: 'spot', spot: 'automations', seenAt: NOW, left: 350, top: 170 }}
        automations={AUTOMATIONS}
      />
    </div>
  )
})
