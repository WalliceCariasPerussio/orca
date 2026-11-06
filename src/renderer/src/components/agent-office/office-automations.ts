import { useEffect, useState } from 'react'
import { AUTOMATIONS_CHANGED_EVENT } from '@/lib/automations-changed-window-event'
import type { Automation } from '../../../../shared/automations-types'
import { getAutomationRunRepoId } from '../../../../shared/automation-run-identity'
import { listAutomationsForTarget } from '../automations/automation-host-client'

/** This computer's automations by the project they run in, kept fresh as Orca reports changes. */
export function useProjectAutomations(): ReadonlyMap<string, readonly Automation[]> {
  const [byProject, setByProject] = useState<ReadonlyMap<string, readonly Automation[]>>(new Map())
  useEffect(() => {
    let cancelled = false
    // Why: a slow earlier list must not land after a newer one and bring back what changed.
    let latest = 0
    const load = (): void => {
      const request = ++latest
      listAutomationsForTarget({ kind: 'local' }).then(
        (automations) => {
          if (cancelled || request !== latest) {
            return
          }
          const next = new Map<string, Automation[]>()
          for (const automation of automations) {
            const repoId = getAutomationRunRepoId(automation)
            next.set(repoId, [...(next.get(repoId) ?? []), automation])
          }
          setByProject(next)
        },
        // Why: the calendar is a glance; without the list it just shows no automations.
        () => {}
      )
    }
    load()
    window.addEventListener(AUTOMATIONS_CHANGED_EVENT, load)
    return () => {
      cancelled = true
      window.removeEventListener(AUTOMATIONS_CHANGED_EVENT, load)
    }
  }, [])
  return byProject
}

/** How many automations each project has, for the calendars on the floors' walls. */
export function automationCounts(
  byProject: ReadonlyMap<string, readonly Automation[]>
): Map<string, number> {
  return new Map([...byProject].map(([repoId, list]) => [repoId, list.length]))
}
