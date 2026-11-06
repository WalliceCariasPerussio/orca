import { translate } from '@/i18n/i18n'
import type { OfficeCrewRole } from './office-crew-roles'

/** One line on the hover label for an agent in an orchestration, as Orca's crew panel puts it. */
export default function CrewRoleLine({
  role,
  agentName
}: {
  role: OfficeCrewRole
  agentName: string
}): React.JSX.Element {
  if (role.kind === 'managing') {
    return (
      <p className="truncate text-muted-foreground">
        {translate('auto.components.agentOffice.crew.managing', 'Managing {{value0}} agents', {
          value0: role.count
        })}
      </p>
    )
  }
  // Why: a worker is often named after its task; say the task only when it adds something.
  const task = role.task && role.task !== agentName ? role.task : null
  return (
    <>
      {role.by ? (
        <p className="truncate text-muted-foreground">
          {translate('auto.components.agentOffice.crew.managedBy', 'Managed by {{value0}}', {
            value0: role.by
          })}
        </p>
      ) : null}
      {task ? (
        <p className="truncate text-muted-foreground">
          {translate('auto.components.agentOffice.crew.task', 'Task: {{value0}}', {
            value0: task
          })}
        </p>
      ) : null}
    </>
  )
}
