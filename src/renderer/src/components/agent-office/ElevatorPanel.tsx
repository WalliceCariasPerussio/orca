import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from '../ui/button'
import { translate } from '@/i18n/i18n'
import { floorIndicator, type OfficeFloor } from './office-floors'

type ElevatorPanelProps = {
  floors: OfficeFloor[]
  currentFloorId: string
  lobbyShort: string
  onChoose: (floorId: string) => void
}

/** Buttons inside the elevator car, top floor first like the building itself. */
export default function ElevatorPanel({
  floors,
  currentFloorId,
  lobbyShort,
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
          </button>
        ))}
      </div>
    </div>
  )
}
