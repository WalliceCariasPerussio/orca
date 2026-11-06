import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { useLiveDashboardSnapshot } from '../dashboard/useLiveDashboardSnapshot'
import { AgentTerminalDialog } from '../dashboard-popout/AgentTerminalDialog'
import { openHeaderCreateComposer } from '../sidebar/worktree-list/rows/header-create-workspace-target'
import ElevatorPanel from './ElevatorPanel'
import HireDeskMenu from './HireDeskMenu'
import OfficeFooter from './OfficeFooter'
import FloorTeamPanel from './FloorTeamPanel'
import OfficeHoverTip, { hoverKey } from './OfficeHoverTip'
import PetShopPanel from './PetShopPanel'
import ReceptionDesk from './ReceptionDesk'
import OfficeWorkspaceMenu, { type OfficeWorkspaceMenuAt } from './OfficeWorkspaceMenu'
import StaffPetsPanel from './StaffPetsPanel'
import { officeAgentsFrom, tallyByFloor } from './office-agents'
import { crewRoleKey, crewRolesFrom } from './office-crew-roles'
import { automationCounts, useProjectAutomations } from './office-automations'
import { OfficeBuilding } from './office-building'
import type { OfficeHover } from './office-building-setup'
import { useFloorTeams } from './office-floor-teams'
import { buildFloors, LOBBY_FLOOR_ID, needingYou, readRememberedFloorId } from './office-floors'
import { useStaffPets } from './office-staff-pets'
import { useTeamPets } from './office-team-draw'
import { thoughtsFrom } from './office-thoughts'
import { hireChoices } from './office-hire-choices'
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

function hireInNewWorkspace(floorId: string): void {
  const repo = useAppStore.getState().repos.find((r) => r.id === floorId)
  if (repo) {
    openHeaderCreateComposer(repo, { pinHost: false })
  }
}

export default function AgentOfficeBuilding(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const buildingRef = useRef<OfficeBuilding | null>(null)
  const repos = useAppStore((s) => s.repos)
  const lobbyName = translate('auto.components.agentOffice.reception.sign', 'Lobby')
  const lobbyShort = translate('auto.components.agentOffice.elevator.lobbyShort', 'L')
  const boardLabel = translate('auto.components.agentOffice.team.boardLabel', 'Team')
  const hireLabel = translate('auto.components.agentOffice.hire.plaque', 'Hiring')
  const floors = useMemo(() => buildFloors(repos, lobbyName), [repos, lobbyName])
  const [remembered] = useState(readRememberedFloorId)
  const [floorId, setFloorId] = useState(remembered ?? LOBBY_FLOOR_ID)
  const [panelOpen, setPanelOpen] = useState(false)
  const [deskAnchor, setDeskAnchor] = useState<{ left: number; top: number } | null>(null)
  const [hovered, setHovered] = useState<OfficeHover | null>(null)
  const [workspaceMenu, setWorkspaceMenu] = useState<OfficeWorkspaceMenuAt | null>(null)
  const [hireAt, setHireAt] = useState<{ left: number; top: number } | null>(null)
  const pointerAt = useRef({ left: 0, top: 0 })
  const [windowOpen, setWindowOpen] = useState<'staff' | 'shop' | 'team' | null>(null)
  const [staffPets, assignStaffPet] = useStaffPets()
  const [floorTeams, setFloorTeam] = useFloorTeams()
  const { cast, failed } = useOfficeCast([
    ...Object.values(staffPets),
    ...Object.values(floorTeams).flat()
  ])

  const snapshot = useLiveDashboardSnapshot()
  const projectAutomations = useProjectAutomations()
  const statusByPaneKey = useAppStore((s) => s.agentStatusByPaneKey)
  const thoughts = useMemo(
    () => thoughtsFrom(snapshot.cards, statusByPaneKey),
    [snapshot.cards, statusByPaneKey]
  )
  const dispatchByPaneKey = useAppStore((s) => s.runtimeAgentOrchestrationByPaneKey)
  const crewRoles = useMemo(
    () => crewRolesFrom(snapshot.cards, statusByPaneKey, dispatchByPaneKey),
    [snapshot.cards, statusByPaneKey, dispatchByPaneKey]
  )
  const freshAgents = officeAgentsFrom(snapshot.cards, staffPets, crewRoles)
  // Why: the snapshot rebuilds on every status tick; reseat the floor only when what it shows changes.
  const agentsKey = freshAgents
    .map((a) =>
      [
        a.key,
        a.floorId,
        a.bucket,
        a.petId,
        a.name,
        a.agentType,
        a.worktreeId,
        a.worktreeName,
        a.since,
        a.verdict ?? '',
        a.monitoring ? 'm' : '',
        a.remoteHost ?? '',
        crewRoleKey(a.crew),
        a.review ? `${a.review.number}${a.review.state}` : '',
        a.workspaceStatus ? `${a.workspaceStatus.id}=${a.workspaceStatus.label}` : '',
        a.workspaceStatus?.color ?? '',
        a.parentKey ?? '',
        ...a.subagents.map((s) => `${s.key}=${s.bucket}=${s.name}`)
      ].join(':')
    )
    .join('|')
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the visible fields above
  const dressedByKind = useMemo(() => freshAgents, [agentsKey])
  const agents = useTeamPets(dressedByKind, floorTeams)
  const tallies = useMemo(() => tallyByFloor(agents), [agents])
  const waiting = useMemo(() => needingYou(agents, floors, floorId), [agents, floors, floorId])
  const visits = useRef(0)
  const agentWindow = useOfficeAgentWindow(snapshot.cards)
  const openAgentWindow = agentWindow.open

  const latest = useRef({
    floors,
    floorId,
    remembered,
    lobbyName,
    lobbyShort,
    boardLabel,
    hireLabel,
    agents,
    thoughts,
    cast,
    snapshot
  })
  useLayoutEffect(() => {
    latest.current = {
      floors,
      floorId,
      remembered,
      lobbyName,
      lobbyShort,
      boardLabel,
      hireLabel,
      agents,
      thoughts,
      cast,
      snapshot
    }
  })
  // Why: the workspace's host tells twins on several hosts apart; any of its agents' cards knows it.
  const openWorkspaceMenu = useCallback((worktreeId: string, at: { left: number; top: number }) => {
    setHovered(null)
    const card = latest.current.snapshot.cards.find((c) => c.worktreeId === worktreeId)
    setWorkspaceMenu({ worktreeId, executionHostId: card?.executionHostId, ...at })
  }, [])

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
      teamBoardLabel: setup.boardLabel,
      hireLabel: setup.hireLabel,
      onPanelChange: (open) => {
        setPanelOpen(open)
        if (!open) {
          canvas.focus({ preventScroll: true })
        }
      },
      onFloorChange: (floor) => setFloorId(floor.id),
      onAgentClick: (paneKey) => {
        setHovered(null)
        // Why: the window hands focus back to what held it on open, so the arrows walk again after closing.
        canvas.focus({ preventScroll: true })
        openAgentWindow(paneKey)
      },
      onSectorClick: (worktreeId, at) => openWorkspaceMenu(worktreeId, at),
      onSpotClick: (spot) => {
        if (spot === 'automations') {
          setHovered(null)
          useAppStore.getState().openAutomationsPage()
        } else if (spot === 'reception') {
          setDeskAnchor(buildingRef.current?.receptionistAnchor() ?? null)
        } else if (spot === 'freeDesk') {
          setHovered(null)
          const { snapshot: live, floorId: here } = latest.current
          if (hireChoices(live, here).length > 0) {
            setHireAt(pointerAt.current)
          } else {
            hireInNewWorkspace(here)
          }
        } else {
          setHovered(null)
          setWindowOpen('team')
        }
      }
    })
    building.setAgents(setup.agents)
    building.setThoughts(setup.thoughts)
    buildingRef.current = building
    let measured = ''
    // Why: resize events also fire without a size change, and would close the reception menu for nothing.
    const measure = (): void => {
      const box = container.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      const size = `${box.width}x${box.height}@${ratio}`
      if (size === measured) {
        return
      }
      measured = size
      building.attach(canvas, box.width, box.height, ratio)
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
  }, [castReady, openAgentWindow, openWorkspaceMenu])

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

  useEffect(() => {
    buildingRef.current?.setThoughts(thoughts)
  }, [thoughts])

  useEffect(() => {
    buildingRef.current?.setAutomationCounts(automationCounts(projectAutomations))
  }, [projectAutomations, castReady])

  const currentFloor = floors.find((f) => f.id === floorId) ?? floors[0]
  const hoveredKey = hovered?.kind === 'agent' ? hovered.agent.key : null
  const hoveredCard = hoveredKey ? snapshot.cards.find((c) => c.paneKey === hoveredKey) : undefined
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
          // Why: a right-click opens the workspace menu on contextmenu, and must not walk or open a window too.
          if (event.button !== 0) {
            return
          }
          const box = event.currentTarget.getBoundingClientRect()
          setDeskAnchor(null)
          setHireAt(null)
          pointerAt.current = { left: event.clientX - box.left, top: event.clientY - box.top }
          buildingRef.current?.pointer(pointerAt.current.left, pointerAt.current.top)
        }}
        onPointerMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect()
          const next = buildingRef.current?.hover(event.clientX - box.left, event.clientY - box.top)
          setHovered((previous) =>
            hoverKey(previous) === hoverKey(next) ? previous : (next ?? null)
          )
        }}
        onPointerLeave={() => setHovered(null)}
        onContextMenu={(event) => {
          event.preventDefault()
          const box = event.currentTarget.getBoundingClientRect()
          const at = { left: event.clientX - box.left, top: event.clientY - box.top }
          const worktreeId = buildingRef.current?.sectorAt(at.left, at.top)
          if (worktreeId) {
            openWorkspaceMenu(worktreeId, at)
          }
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
      {hovered ? (
        <OfficeHoverTip
          hover={hovered}
          thought={hoveredKey ? thoughts.get(hoveredKey) : undefined}
          model={hoveredKey ? statusByPaneKey[hoveredKey]?.model : undefined}
          status={hoveredKey ? statusByPaneKey[hoveredKey] : undefined}
          asked={hoveredCard?.lastUserMessage}
          automations={projectAutomations.get(currentFloor.id)}
        />
      ) : null}
      {cast ? (
        <OfficeFooter
          inLobby={currentFloor.number === 0}
          waitingCount={waiting.length}
          disabled={panelOpen}
          onVisit={() => {
            const next = waiting[visits.current++ % waiting.length]
            buildingRef.current?.visit(next.key)
          }}
          onCallElevator={() => buildingRef.current?.callElevator()}
        />
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
      {hireAt ? (
        <HireDeskMenu
          anchor={hireAt}
          choices={hireChoices(snapshot, currentFloor.id)}
          onNewWorkspace={() => {
            setHireAt(null)
            hireInNewWorkspace(currentFloor.id)
          }}
          onClose={() => setHireAt(null)}
        />
      ) : null}
      {workspaceMenu ? (
        <OfficeWorkspaceMenu
          key={`${workspaceMenu.worktreeId}@${workspaceMenu.left},${workspaceMenu.top}`}
          at={workspaceMenu}
          onClose={() => setWorkspaceMenu(null)}
        />
      ) : null}
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
      {windowOpen === 'team' && currentFloor.number !== 0 ? (
        <FloorTeamPanel
          floorName={currentFloor.name}
          team={floorTeams[currentFloor.id] ?? []}
          onChange={(petIds) => setFloorTeam(currentFloor.id, petIds)}
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
