import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import type { DashboardBucket } from '../../../../shared/dashboard-snapshot'
import { Button } from '../ui/button'
import { useLiveDashboardSnapshot } from '../dashboard/useLiveDashboardSnapshot'
import { AgentTerminalDialog } from '../dashboard-popout/AgentTerminalDialog'
import ElevatorPanel from './ElevatorPanel'
import PetShopPanel from './PetShopPanel'
import ReceptionDesk from './ReceptionDesk'
import StaffPetsPanel from './StaffPetsPanel'
import { officeAgentsFrom, tallyByFloor } from './office-agents'
import { OfficeBuilding, type AgentHover } from './office-building'
import { buildFloors, LOBBY_FLOOR_ID, readRememberedFloorId } from './office-floors'
import { useStaffPets } from './office-staff-pets'
import { useOfficeAgentWindow } from './use-office-agent-window'
import { useOfficeCast } from './use-office-cast'

const STEP_KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0]
}

function bucketLabel(bucket: DashboardBucket): string {
  switch (bucket) {
    case 'attention':
      return translate('dashboardPopout.bucket.attention', 'Needs You')
    case 'working':
      return translate('dashboardPopout.bucket.working', 'Working')
    case 'done':
      return translate('dashboardPopout.bucket.done', 'Done')
    case 'idle':
      return translate('dashboardPopout.bucket.idle', 'Idle')
  }
}

export default function AgentOfficeBuilding(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const buildingRef = useRef<OfficeBuilding | null>(null)
  const repos = useAppStore((s) => s.repos)
  const lobbyName = translate('auto.components.agentOffice.reception.sign', 'Lobby')
  const lobbyShort = translate('auto.components.agentOffice.elevator.lobbyShort', 'L')
  const floors = useMemo(() => buildFloors(repos, lobbyName), [repos, lobbyName])
  const [remembered] = useState(readRememberedFloorId)
  const [floorId, setFloorId] = useState(remembered ?? LOBBY_FLOOR_ID)
  const [panelOpen, setPanelOpen] = useState(false)
  const [deskAnchor, setDeskAnchor] = useState<{ left: number; top: number } | null>(null)
  const [hovered, setHovered] = useState<AgentHover | null>(null)
  const [windowOpen, setWindowOpen] = useState<'staff' | 'shop' | null>(null)
  const [staffPets, assignStaffPet] = useStaffPets()
  const { cast, failed } = useOfficeCast(Object.values(staffPets))

  const snapshot = useLiveDashboardSnapshot()
  const freshAgents = officeAgentsFrom(snapshot.cards, staffPets)
  // Why: the snapshot rebuilds on every status tick; reseat the floor only when what it shows changes.
  const agentsKey = freshAgents
    .map((a) => `${a.key}:${a.floorId}:${a.bucket}:${a.petId}:${a.name}`)
    .join('|')
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the visible fields above
  const agents = useMemo(() => freshAgents, [agentsKey])
  const tallies = useMemo(() => tallyByFloor(agents), [agents])
  const agentWindow = useOfficeAgentWindow(snapshot.cards)
  const openAgentWindow = agentWindow.open

  const latest = useRef({ floors, floorId, remembered, lobbyName, lobbyShort, agents, cast })
  useLayoutEffect(() => {
    latest.current = { floors, floorId, remembered, lobbyName, lobbyShort, agents, cast }
  })

  const castReady = cast !== null
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    const setup = latest.current
    if (!setup.cast || !canvas || !container) {
      return
    }
    const building = new OfficeBuilding({
      floors: setup.floors,
      floorId: setup.floorId,
      startAtEntrance: setup.remembered === null,
      avatar: setup.cast.avatar,
      receptionist: setup.cast.receptionist,
      staffSprites: setup.cast.staff,
      lobbySign: setup.lobbyName,
      lobbyShort: setup.lobbyShort,
      onPanelChange: (open) => {
        setPanelOpen(open)
        if (!open) {
          canvas.focus({ preventScroll: true })
        }
      },
      onFloorChange: (floor) => setFloorId(floor.id),
      onAgentClick: (agent) => {
        setHovered(null)
        // Why: the window hands focus back to what held it on open, so the arrows walk again after closing.
        canvas.focus({ preventScroll: true })
        openAgentWindow(agent.key)
      },
      onReceptionistClick: () => setDeskAnchor(buildingRef.current?.receptionistAnchor() ?? null)
    })
    building.setAgents(setup.agents)
    buildingRef.current = building
    const measure = (): void => {
      const box = container.getBoundingClientRect()
      building.attach(canvas, box.width, box.height, window.devicePixelRatio || 1)
      setDeskAnchor(null)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
      building.dispose()
      buildingRef.current = null
    }
  }, [castReady, openAgentWindow])

  useEffect(() => {
    if (cast) {
      buildingRef.current?.setAvatar(cast.avatar)
      buildingRef.current?.setStaffSprites(cast.staff)
    }
  }, [cast])

  useEffect(() => {
    buildingRef.current?.setFloors(floors)
  }, [floors])

  useEffect(() => {
    buildingRef.current?.setAgents(agents)
  }, [agents])

  const currentFloor = floors.find((f) => f.id === floorId) ?? floors[0]
  return (
    <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="application"
        aria-label={translate(
          'auto.components.agentOffice.building.label',
          'Agent Office. Arrow keys walk, Enter calls the elevator.'
        )}
        className="absolute inset-0 size-full cursor-pointer outline-none"
        onPointerDown={(event) => {
          const box = event.currentTarget.getBoundingClientRect()
          setDeskAnchor(null)
          buildingRef.current?.pointer(event.clientX - box.left, event.clientY - box.top)
        }}
        onPointerMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect()
          const next = buildingRef.current?.hover(event.clientX - box.left, event.clientY - box.top)
          setHovered((previous) =>
            (previous?.agent.key ?? null) === (next?.agent.key ?? null) ? previous : (next ?? null)
          )
        }}
        onPointerLeave={() => setHovered(null)}
        onKeyDown={(event) => {
          const step = STEP_KEYS[event.key]
          if (step) {
            event.preventDefault()
            buildingRef.current?.step(step[0], step[1])
          } else if (event.key === 'Enter') {
            event.preventDefault()
            buildingRef.current?.callElevator()
          }
        }}
      />
      {hovered ? (
        <div
          className="pointer-events-none absolute z-10 max-w-64 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-floating"
          style={{ left: hovered.left, top: hovered.top }}
        >
          <p className="truncate font-medium">{hovered.agent.name}</p>
          <p className="text-muted-foreground">
            {bucketLabel(hovered.agent.bucket)} ·{' '}
            {translate(
              'auto.components.agentOffice.building.openTerminal',
              'click to open the terminal'
            )}
          </p>
        </div>
      ) : null}
      {cast ? (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {translate(
              'auto.components.agentOffice.building.hint',
              'Click the floor to walk. Click the elevator to change floors.'
            )}
          </p>
          <span className="pointer-events-auto">
            <Button
              variant="outline"
              size="sm"
              disabled={panelOpen}
              onClick={() => buildingRef.current?.callElevator()}
            >
              {translate('auto.components.agentOffice.elevator.call', 'Call elevator')}
            </Button>
          </span>
        </div>
      ) : (
        <p className="absolute inset-0 grid place-content-center text-sm text-muted-foreground">
          {failed
            ? translate(
                'auto.components.agentOffice.reception.loadFailed',
                'The office could not open.'
              )
            : translate('auto.components.agentOffice.reception.loading', 'Opening the office…')}
        </p>
      )}
      {deskAnchor ? (
        <ReceptionDesk
          anchor={deskAnchor}
          onClose={() => setDeskAnchor(null)}
          onOpenStaffPets={() => {
            setDeskAnchor(null)
            setWindowOpen('staff')
          }}
          onOpenShop={() => {
            setDeskAnchor(null)
            setWindowOpen('shop')
          }}
        />
      ) : null}
      {windowOpen === 'staff' ? (
        <StaffPetsPanel
          staffPets={staffPets}
          onAssign={assignStaffPet}
          onOpenShop={() => setWindowOpen('shop')}
          onClose={() => setWindowOpen(null)}
        />
      ) : null}
      {windowOpen === 'shop' ? <PetShopPanel onClose={() => setWindowOpen(null)} /> : null}
      <AgentTerminalDialog
        card={agentWindow.card}
        onOpenChange={agentWindow.onOpenChange}
        onReveal={agentWindow.onReveal}
        onBrowserForeground={agentWindow.onBrowserForeground}
      />
      {panelOpen ? (
        <ElevatorPanel
          floors={floors}
          currentFloorId={currentFloor.id}
          lobbyShort={lobbyShort}
          tallies={tallies}
          onChoose={(id) => buildingRef.current?.choose(id)}
        />
      ) : null}
    </div>
  )
}
