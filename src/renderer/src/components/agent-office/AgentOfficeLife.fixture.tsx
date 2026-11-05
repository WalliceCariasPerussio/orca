import { defineFixture } from '../../component-fixtures/component-fixture'
import type { DashboardCardReview } from '../../../../shared/dashboard-snapshot'
import OfficeHoverTip from './OfficeHoverTip'
import { agentsWith, fakeAgents, StaffedFloor, stagedRepos, waitFor } from './office-staged-floor'

const TURN_MS = 6000
const NOW = Date.now()

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
