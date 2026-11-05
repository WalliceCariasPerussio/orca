import { defineFixture } from '../../component-fixtures/component-fixture'
import { StaffedFloor, stagedRepos, waitFor } from './office-staged-floor'

const TURN_MS = 6000

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
