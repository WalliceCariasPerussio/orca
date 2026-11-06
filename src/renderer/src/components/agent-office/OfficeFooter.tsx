import { translate } from '@/i18n/i18n'
import { Button } from '../ui/button'

/** The hint along the bottom of the office, and the buttons to reach who needs you and the elevator. */
export default function OfficeFooter({
  inLobby,
  waitingCount,
  disabled,
  onVisit,
  onCallElevator
}: {
  inLobby: boolean
  /** Agents waiting on you anywhere in the building. */
  waitingCount: number
  /** True while you ride the elevator. */
  disabled: boolean
  onVisit: () => void
  onCallElevator: () => void
}): React.JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between gap-3">
      <p className="text-xs text-muted-foreground">
        {inLobby
          ? translate(
              'auto.components.agentOffice.building.hint',
              'Click the floor to walk. Click the elevator to change floors. Click an agent to open its terminal.'
            )
          : translate(
              'auto.components.agentOffice.building.floorHint',
              "Click the floor to walk. Click an agent to see its terminal. Click the whiteboard to pick this floor's team. Click a free desk to hire an agent."
            )}
      </p>
      <span className="pointer-events-auto flex shrink-0 gap-2">
        {waitingCount > 0 ? (
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            title={translate(
              'auto.components.agentOffice.visit.hint',
              "Takes the elevator if needed, walks up to the agent's desk and opens its terminal. Click again for the next one."
            )}
            onClick={onVisit}
          >
            <span aria-hidden className="size-1.5 rounded-full bg-destructive" />
            {translate(
              'auto.components.agentOffice.visit.button',
              'Go to who needs you ({{value0}})',
              {
                value0: waitingCount
              }
            )}
          </Button>
        ) : null}
        <Button variant="outline" size="sm" disabled={disabled} onClick={onCallElevator}>
          {translate('auto.components.agentOffice.elevator.call', 'Call elevator')}
        </Button>
      </span>
    </div>
  )
}
