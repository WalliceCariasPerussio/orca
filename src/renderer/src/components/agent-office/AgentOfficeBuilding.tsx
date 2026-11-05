import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import type { CustomPet } from '../../../../shared/pet-types'
import { Button } from '../ui/button'
import { BUNDLED_PETS } from '../pet/pet-models'
import { usePetUrl } from '../pet/usePetUrl'
import ElevatorPanel from './ElevatorPanel'
import { loadOfficeAssets } from './office-asset-loading'
import { OfficeBuilding } from './office-building'
import { loadElevatorSprite } from './office-elevator'
import { buildFloors, LOBBY_FLOOR_ID, readRememberedFloorId } from './office-floors'
import { loadPetSprite, type PetSprite } from './office-pet-sprite'

type Cast = { avatar: PetSprite; receptionist: PetSprite | null }

const PET_WAIT_MS = 1500

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
  const [cast, setCast] = useState<Cast | null>(null)
  const [failed, setFailed] = useState(false)

  const pet = usePetUrl()
  // Why: usePetUrl rebuilds the grid object each render; its contents are what should reload frames.
  const gridKey = pet.sprite ? JSON.stringify(pet.sprite) : ''
  const grid = useMemo(
    () => (gridKey ? (JSON.parse(gridKey) as NonNullable<CustomPet['sprite']>) : null),
    [gridKey]
  )
  const petId = useAppStore((s) => s.petId)
  const receptionistUrl = (BUNDLED_PETS.find((p) => p.id !== petId) ?? BUNDLED_PETS[0]).url
  // Why: a custom pet whose file is missing never turns ready; open with the bundled stand-in meanwhile.
  const [petWaitOver, setPetWaitOver] = useState(false)
  useEffect(() => {
    if (pet.ready) {
      return
    }
    const timer = window.setTimeout(() => setPetWaitOver(true), PET_WAIT_MS)
    return () => window.clearTimeout(timer)
  }, [pet.ready])
  const petUsable = pet.ready || petWaitOver

  const latest = useRef({ floors, floorId, remembered, lobbyName, lobbyShort })
  useLayoutEffect(() => {
    latest.current = { floors, floorId, remembered, lobbyName, lobbyShort }
  })

  useEffect(() => {
    if (!petUsable) {
      return
    }
    let cancelled = false
    void Promise.all([
      loadOfficeAssets(),
      loadElevatorSprite(),
      loadPetSprite(pet.url, grid),
      loadPetSprite(receptionistUrl, null).catch(() => null)
    ]).then(
      ([, , avatar, receptionist]) => {
        if (cancelled) {
          return
        }
        if (buildingRef.current) {
          buildingRef.current.setAvatar(avatar)
        } else {
          setCast({ avatar, receptionist })
        }
      },
      () => {
        if (!cancelled) {
          setFailed(true)
        }
      }
    )
    return () => {
      cancelled = true
    }
  }, [petUsable, pet.url, grid, receptionistUrl])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!cast || !canvas || !container) {
      return
    }
    const setup = latest.current
    const building = new OfficeBuilding({
      floors: setup.floors,
      floorId: setup.floorId,
      startAtEntrance: setup.remembered === null,
      avatar: cast.avatar,
      receptionist: cast.receptionist,
      lobbySign: setup.lobbyName,
      lobbyShort: setup.lobbyShort,
      onPanelChange: (open) => {
        setPanelOpen(open)
        if (!open) {
          canvas.focus({ preventScroll: true })
        }
      },
      onFloorChange: (floor) => setFloorId(floor.id)
    })
    buildingRef.current = building
    const measure = (): void => {
      const box = container.getBoundingClientRect()
      building.attach(canvas, box.width, box.height, window.devicePixelRatio || 1)
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
  }, [cast])

  useEffect(() => {
    buildingRef.current?.setFloors(floors)
  }, [floors])

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
          buildingRef.current?.pointer(event.clientX - box.left, event.clientY - box.top)
        }}
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
      {panelOpen ? (
        <ElevatorPanel
          floors={floors}
          currentFloorId={currentFloor.id}
          lobbyShort={lobbyShort}
          onChoose={(id) => buildingRef.current?.choose(id)}
        />
      ) : null}
    </div>
  )
}
