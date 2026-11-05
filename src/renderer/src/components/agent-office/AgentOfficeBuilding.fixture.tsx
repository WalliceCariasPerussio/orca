import { defineFixture } from '../../component-fixtures/component-fixture'
import type { Repo } from '../../../../shared/repo-types'
import AgentOfficeBuilding from './AgentOfficeBuilding'

const FLOOR_KEY = 'orca.agentOffice.floorId'

const repos: Repo[] = [
  { id: 'www', path: 'F:/www', displayName: 'www', badgeColor: '#6b7280', addedAt: 1 },
  { id: 'mesa', path: 'F:/MesaLocal', displayName: 'MesaLocal', badgeColor: '#3b82f6', addedAt: 2 },
  { id: 'banca', path: 'F:/banca', displayName: 'banca', badgeColor: '#16a34a', addedAt: 3 }
]

async function waitFor(frame: HTMLElement, selector: string): Promise<void> {
  for (let i = 0; i < 80 && !frame.querySelector(selector); i++) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

function Stage(): React.JSX.Element {
  return (
    <div className="flex flex-col" style={{ height: 600 }}>
      <AgentOfficeBuilding />
    </div>
  )
}

export const missingCustomPet = defineFixture({
  width: 960,
  store: {
    repos,
    petId: 'missing-pet',
    customPets: [
      { id: 'missing-pet', label: 'Missing', fileName: 'spritesheet.webp', mimeType: 'image/webp' }
    ]
  },
  setup: () => localStorage.removeItem(FLOOR_KEY),
  render: () => <Stage />,
  interact: (frame) => waitFor(frame, 'canvas + div button')
})

export const lobby = defineFixture({
  width: 960,
  store: { repos },
  setup: () => localStorage.removeItem(FLOOR_KEY),
  render: () => <Stage />,
  interact: (frame) => waitFor(frame, 'canvas + div button')
})

export const projectFloor = defineFixture({
  width: 960,
  store: { repos },
  setup: () => localStorage.setItem(FLOOR_KEY, 'mesa'),
  render: () => <Stage />,
  interact: (frame) => waitFor(frame, 'canvas + div button')
})

export const rideToLobby = defineFixture({
  width: 960,
  store: { repos },
  setup: () => localStorage.setItem(FLOOR_KEY, 'mesa'),
  render: () => <Stage />,
  interact: async (frame) => {
    await waitFor(frame, 'canvas + div button')
    frame.querySelector<HTMLButtonElement>('canvas + div button')?.click()
    await waitFor(frame, '[role="dialog"]')
    const buttons = frame.querySelectorAll<HTMLButtonElement>('[role="dialog"] [aria-current]')
    Array.from(buttons).at(-1)?.click()
    await new Promise((resolve) => setTimeout(resolve, 4500))
  }
})

export const walkFromEntrance = defineFixture({
  width: 960,
  store: { repos },
  setup: () => localStorage.removeItem(FLOOR_KEY),
  render: () => <Stage />,
  interact: async (frame) => {
    await waitFor(frame, 'canvas + div button')
    frame.querySelector<HTMLButtonElement>('canvas + div button')?.click()
    await waitFor(frame, '[role="dialog"]')
  }
})

export const elevatorPanel = defineFixture({
  width: 960,
  store: { repos },
  setup: () => localStorage.setItem(FLOOR_KEY, 'mesa'),
  render: () => <Stage />,
  interact: async (frame) => {
    await waitFor(frame, 'canvas + div button')
    frame.querySelector<HTMLButtonElement>('canvas + div button')?.click()
    await waitFor(frame, '[role="dialog"]')
  }
})
