import { useEffect, useRef } from 'react'
import { defineFixture } from '../../component-fixtures/component-fixture'
import type { DashboardBucket } from '../../../../shared/dashboard-snapshot'
import type { Repo } from '../../../../shared/repo-types'
import AgentOfficeBuilding from './AgentOfficeBuilding'
import type { OfficeAgent } from './office-agents'
import { OfficeBuilding } from './office-building'
import { buildFloors } from './office-floors'
import { DEFAULT_STAFF_PETS, roleForAgentType } from './office-staff-pets'
import { useOfficeCast } from './use-office-cast'

const FLOOR_KEY = 'orca.agentOffice.floorId'

const repos: Repo[] = [
  { id: 'www', path: 'F:/www', displayName: 'www', badgeColor: '#6b7280', addedAt: 1 },
  { id: 'mesa', path: 'F:/MesaLocal', displayName: 'MesaLocal', badgeColor: '#3b82f6', addedAt: 2 },
  { id: 'banca', path: 'F:/banca', displayName: 'banca', badgeColor: '#16a34a', addedAt: 3 }
]

const STAFF: [string, DashboardBucket][] = [
  ['claude', 'working'],
  ['opencode', 'attention'],
  ['codex', 'done'],
  ['claude', 'idle'],
  ['codex', 'working'],
  ['opencode', 'working'],
  ['claude', 'attention']
]

function fakeAgents(): OfficeAgent[] {
  return STAFF.map(([agentType, bucket], i) => ({
    key: `pane-${i}`,
    floorId: 'mesa',
    name: `${agentType} ${i + 1}`,
    bucket,
    petId: DEFAULT_STAFF_PETS[roleForAgentType(agentType)],
    startedAt: i,
    reveal: { repoId: 'mesa', worktreeId: 'w', tabId: 't', leafId: null }
  }))
}

// Why: live agents come from terminals a fixture cannot start, so this drives the building directly.
function StaffedFloor(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { cast } = useOfficeCast(Object.values(DEFAULT_STAFF_PETS))
  useEffect(() => {
    const canvas = canvasRef.current
    if (!cast || !canvas) {
      return
    }
    const building = new OfficeBuilding({
      floors: buildFloors(repos, 'Recepção'),
      floorId: 'mesa',
      startAtEntrance: false,
      avatar: cast.avatar,
      receptionist: cast.receptionist,
      staffSprites: cast.staff,
      lobbySign: 'Recepção',
      lobbyShort: 'T',
      onPanelChange: () => {},
      onFloorChange: () => {},
      onAgentClick: () => {},
      onReceptionistClick: () => {}
    })
    building.setAgents(fakeAgents())
    building.attach(canvas, 960, 600, 1)
    canvas.dataset.ready = 'true'
    return () => building.dispose()
  }, [cast])
  return <canvas ref={canvasRef} style={{ width: 960, height: 600 }} />
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
