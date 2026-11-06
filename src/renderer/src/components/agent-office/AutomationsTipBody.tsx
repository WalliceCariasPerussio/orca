import { translate } from '@/i18n/i18n'
import { formatUiRelativeTime } from '@/i18n/relative-time-format'
import type { Automation } from '../../../../shared/automations-types'

const SHOWN = 4

/** What the floor's wall calendar says on hover: the project's automations and when each runs next. */
export default function AutomationsTipBody({
  automations,
  seenAt
}: {
  automations: readonly Automation[]
  seenAt: number
}): React.JSX.Element {
  const soonest = automations.toSorted(
    (a, b) => Number(b.enabled) - Number(a.enabled) || a.nextRunAt - b.nextRunAt
  )
  return (
    <>
      <p className="truncate font-medium">
        {translate('auto.components.automations.AutomationsPage.77c2778945', 'Automations')}
      </p>
      {soonest.length === 0 ? (
        <p className="text-muted-foreground">
          {translate('auto.components.agentOffice.automations.none', 'None for this project yet.')}
        </p>
      ) : (
        soonest.slice(0, SHOWN).map((automation) => (
          <p key={automation.id} className="truncate">
            {automation.name}
            <span className="text-muted-foreground">
              {' · '}
              {automation.enabled
                ? translate('auto.components.agentOffice.automations.next', 'next {{value0}}', {
                    value0: formatUiRelativeTime(automation.nextRunAt - seenAt)
                  })
                : translate('auto.components.agentOffice.automations.paused', 'paused')}
            </span>
          </p>
        ))
      )}
      {soonest.length > SHOWN ? (
        <p className="text-muted-foreground">
          {translate('auto.components.agentOffice.automations.more', 'and {{value0}} more', {
            value0: soonest.length - SHOWN
          })}
        </p>
      ) : null}
      <p className="text-muted-foreground">
        {translate('auto.components.agentOffice.automations.hint', 'click to open Automations')}
      </p>
    </>
  )
}
