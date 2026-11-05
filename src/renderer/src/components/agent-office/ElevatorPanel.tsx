import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from '../ui/button'
import { translate } from '@/i18n/i18n'
import type { FloorTally } from './office-agents'
import { floorIndicator, type OfficeFloor } from './office-floors'

type ElevatorPanelProps = {
  floors: OfficeFloor[]
  currentFloorId: string
  lobbyShort: string
  tallies: ReadonlyMap<string, FloorTally>
  onChoose: (floorId: string) => void
}

function FloorTallyChips({ tally }: { tally: FloorTally | undefined }): React.JSX.Element | null {
  if (!tally || tally.attention + tally.working + tally.done === 0) {
    return null
  }
  const label = translate(
    'auto.components.agentOffice.elevator.tally',
    '{{value0}} need you, {{value1}} working, {{value2}} done',
    { value0: tally.attention, value1: tally.working, value2: tally.done }
  )
  return (
    <span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs tabular-nums" title={label}>
      <span className="sr-only">{label}</span>
      {tally.attention > 0 ? (
        <span aria-hidden className="flex items-center gap-0.5 font-semibold text-destructive">
          <span className="size-1.5 rounded-full bg-destructive" />
          {tally.attention}
        </span>
      ) : null}
      {tally.working > 0 ? (
        <span aria-hidden className="flex items-center gap-0.5 text-muted-foreground">
          <span className="size-1.5 rounded-full bg-(--status-warning)" />
          {tally.working}
        </span>
      ) : null}
      {tally.done > 0 ? (
        <span aria-hidden className="flex items-center gap-0.5 text-muted-foreground">
          <span className="size-1.5 rounded-full bg-(--status-success)" />
          {tally.done}
        </span>
      ) : null}
    </span>
  )
}

// Why: like a real panel, a floor's number rides there; 0 or the lobby's letter goes down.
function floorForKey(
  floors: readonly OfficeFloor[],
  key: string,
  lobbyShort: string
): OfficeFloor | undefined {
  if (key === '0' || key.toLowerCase() === lobbyShort.toLowerCase()) {
    return floors.find((floor) => floor.number === 0)
  }
  return /^[1-9]$/.test(key) ? floors.find((floor) => String(floor.number) === key) : undefined
}

/** Buttons inside the elevator car, top floor first like the building itself. */
export default function ElevatorPanel({
  floors,
  currentFloorId,
  lobbyShort,
  tallies,
  onChoose
}: ElevatorPanelProps): React.JSX.Element {
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    listRef.current?.querySelector<HTMLButtonElement>('[aria-current="true"]')?.focus()
  }, [])
  const title = translate('auto.components.agentOffice.elevator.title', 'Elevator')
  return (
    <div
      role="dialog"
      aria-label={title}
      className="absolute top-3 left-3 z-10 flex max-h-[calc(100%-1.5rem)] w-72 flex-col rounded-xl border border-border bg-popover text-popover-foreground shadow-floating"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          // Why: the page closes on Escape; here it only steps you out of the car.
          event.preventDefault()
          event.stopPropagation()
          onChoose(currentFloorId)
          return
        }
        const floor = floorForKey(floors, event.key, lobbyShort)
        if (floor) {
          event.preventDefault()
          onChoose(floor.id)
        }
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border py-2 pr-2 pl-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={translate(
            'auto.components.agentOffice.elevator.close',
            'Close the panel and step out'
          )}
          onClick={() => onChoose(currentFloorId)}
        >
          <X />
        </Button>
      </div>
      <div
        ref={listRef}
        className="scrollbar-sleek flex min-h-0 flex-col gap-0.5 overflow-y-auto p-1.5"
      >
        {floors.toReversed().map((floor) => (
          <button
            key={floor.id}
            type="button"
            aria-current={floor.id === currentFloorId}
            onClick={() => onChoose(floor.id)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring aria-[current=true]:bg-accent aria-[current=true]:font-medium"
          >
            <span className="w-6 shrink-0 text-center font-mono text-xs text-muted-foreground tabular-nums">
              {floorIndicator(floor, lobbyShort)}
            </span>
            <span className="min-w-0 truncate">{floor.name}</span>
            <FloorTallyChips tally={tallies.get(floor.id)} />
          </button>
        ))}
      </div>
    </div>
  )
}
