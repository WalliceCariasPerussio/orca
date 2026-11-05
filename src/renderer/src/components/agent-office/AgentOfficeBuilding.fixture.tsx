import { defineFixture } from '../../component-fixtures/component-fixture'
import AgentOfficeBuilding from './AgentOfficeBuilding'
import type { OfficeAgent } from './office-agents'
import {
  agentsWith,
  fakeAgents,
  StaffedFloor,
  stagedRepos as repos,
  waitFor
} from './office-staged-floor'
import { drawTeamPets } from './office-team-draw'
import { BUNDLED_PETS, GREMLIN_PET_ID, OPENCODE_PET_ID } from '../pet/pet-models'

const FLOOR_KEY = 'orca.agentOffice.floorId'

/** Two desks with sub-agents: one with two in its terminal, one with a spawned Codex and four more. */
function crewAgents(): OfficeAgent[] {
  const [first, second, ...rest] = fakeAgents().slice(0, 4)
  const inside = (parent: OfficeAgent, count: number): OfficeAgent['subagents'] =>
    Array.from({ length: count }, (_, i) => ({
      key: `${parent.key}/sub-${i}`,
      name: `Explore ${i + 1}`,
      bucket: i === 1 && count === 2 ? 'attention' : 'working'
    }))
  const spawned: OfficeAgent = {
    ...second,
    key: 'pane-spawned',
    name: 'codex worker',
    agentType: 'codex',
    bucket: 'working',
    petId: GREMLIN_PET_ID,
    startedAt: 10,
    parentKey: second.key
  }
  return [
    { ...first, subagents: inside(first, 2) },
    { ...second, subagents: inside(second, 4) },
    ...rest,
    spawned
  ]
}

/** The same agents with every bundled pet on the floor's team, so pets no longer follow the kind. */
function teamAgents(): OfficeAgent[] {
  const agents = fakeAgents()
  const drawn = drawTeamPets(agents, { mesa: BUNDLED_PETS.map((p) => p.id) }, new Map())
  return agents.map((agent) => ({ ...agent, petId: drawn.get(agent.key) ?? agent.petId }))
}

/** The usual floor, plus an agent two floors up waiting on you. */
function agentsWithCallUpstairs(): OfficeAgent[] {
  const upstairs: OfficeAgent = {
    ...fakeAgents()[0],
    key: 'pane-banca',
    floorId: 'banca',
    name: 'claude banca',
    bucket: 'attention',
    worktreeId: 'wt-banca',
    worktreeName: 'feat/pix'
  }
  return [...agentsWith({ 'pane-1': 'working', 'pane-6': 'working' }), upstairs]
}

export const teamFloor = defineFixture({
  width: 960,
  store: { repos },
  render: () => <StaffedFloor agents={teamAgents()} />,
  interact: async (frame) => {
    await waitFor(frame, 'canvas[data-ready]')
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
})

export const cheer = defineFixture({
  width: 960,
  store: { repos },
  render: () => <StaffedFloor then={agentsWith({ 'pane-0': 'done', 'pane-4': 'done' })} />,
  interact: async (frame) => {
    await waitFor(frame, 'canvas[data-ready]')
    await new Promise((resolve) => setTimeout(resolve, 380))
  }
})

export const lounge = defineFixture({
  width: 960,
  store: { repos },
  render: () => <StaffedFloor agents={agentsWith({ 'pane-5': 'idle' })} />,
  interact: async (frame) => {
    await waitFor(frame, 'canvas[data-ready]')
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
})

export const backToWork = defineFixture({
  width: 960,
  store: { repos },
  render: () => <StaffedFloor then={agentsWith({ 'pane-3': 'working', 'pane-2': 'attention' })} />,
  interact: async (frame) => {
    await waitFor(frame, 'canvas[data-ready]')
    await new Promise((resolve) => setTimeout(resolve, 900))
  }
})

export const callFromUpstairs = defineFixture({
  width: 960,
  store: { repos },
  render: () => <StaffedFloor agents={agentsWithCallUpstairs()} />,
  interact: async (frame) => {
    await waitFor(frame, 'canvas[data-ready]')
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
})

export const visitUpstairs = defineFixture({
  width: 960,
  store: { repos },
  render: () => <StaffedFloor agents={agentsWithCallUpstairs()} visit="pane-banca" />,
  interact: async (frame) => {
    await waitFor(frame, 'canvas[data-ready]')
    await new Promise((resolve) => setTimeout(resolve, 7000))
  }
})

export const subagents = defineFixture({
  width: 960,
  store: { repos },
  render: () => <StaffedFloor agents={crewAgents()} />,
  interact: async (frame) => {
    await waitFor(frame, 'canvas[data-ready]')
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
})

export const teamBoard = defineFixture({
  width: 960,
  store: { repos },
  setup: () => {
    localStorage.setItem(FLOOR_KEY, 'mesa')
    localStorage.setItem(
      'orca.agentOffice.floorTeams',
      JSON.stringify({ mesa: [GREMLIN_PET_ID, OPENCODE_PET_ID] })
    )
  },
  render: () => <Stage />,
  interact: async (frame) => {
    await waitFor(frame, 'canvas + div button')
    await new Promise((resolve) => setTimeout(resolve, 300))
    pointAtWorld(frame, 'pointerdown', 48, 16)
    await waitFor(frame, '[role="dialog"]')
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
})

export const teamBoardHover = defineFixture({
  width: 960,
  store: { repos },
  setup: () => localStorage.setItem(FLOOR_KEY, 'mesa'),
  render: () => <Stage />,
  interact: async (frame) => {
    await waitFor(frame, 'canvas + div button')
    await new Promise((resolve) => setTimeout(resolve, 300))
    pointAtWorld(frame, 'pointermove', 48, 16)
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
})

export const freeDeskHover = defineFixture({
  width: 960,
  store: { repos },
  setup: () => localStorage.setItem(FLOOR_KEY, 'mesa'),
  render: () => <Stage />,
  interact: async (frame) => {
    await waitFor(frame, 'canvas + div button')
    await new Promise((resolve) => setTimeout(resolve, 300))
    pointAtWorld(frame, 'pointermove', 120, 96)
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
})

// Why: mirror the office's integer-zoom centering for a 20x14-tile room.
function pointAtWorld(
  frame: HTMLElement,
  type: 'pointerdown' | 'pointermove',
  worldX: number,
  worldY: number
): void {
  const canvas = frame.querySelector('canvas')
  const box = canvas?.getBoundingClientRect()
  if (!canvas || !box) {
    return
  }
  const zoom = Math.floor(Math.min(box.width / 320, box.height / 224))
  canvas.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      clientX: box.left + Math.floor((box.width - 320 * zoom) / 2) + worldX * zoom,
      clientY: box.top + Math.floor((box.height - 224 * zoom) / 2) + worldY * zoom
    })
  )
}

export const staffedFloor = defineFixture({
  width: 960,
  store: { repos },
  render: () => <StaffedFloor />,
  interact: async (frame) => {
    await waitFor(frame, 'canvas[data-ready]')
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
})

export const receptionDesk = defineFixture({
  width: 960,
  store: { repos },
  setup: () => localStorage.removeItem(FLOOR_KEY),
  render: () => <Stage />,
  interact: async (frame) => {
    await waitFor(frame, 'canvas + div button')
    const canvas = frame.querySelector('canvas')
    const box = canvas?.getBoundingClientRect()
    if (canvas && box) {
      // Why: mirror the office's integer-zoom centering for a 20x14-tile room; the receptionist's head is at world (168, 86).
      const zoom = Math.floor(Math.min(box.width / 320, box.height / 224))
      const init = {
        bubbles: true,
        clientX: box.left + Math.floor((box.width - 320 * zoom) / 2) + 168 * zoom,
        clientY: box.top + Math.floor((box.height - 224 * zoom) / 2) + 86 * zoom
      }
      canvas.dispatchEvent(new PointerEvent('pointerdown', init))
    }
    await waitFor(frame, '[role="dialog"]')
  }
})

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
