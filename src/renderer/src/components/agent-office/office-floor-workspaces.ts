import { useMemo } from 'react'
import { useAppStore } from '@/store'
import { selectIsSleepingWorktree } from '../sidebar/workspace-actions/sleep/use-worktree-sleep-state'
import type { DashboardCardReview, DashboardWorkspace } from '../../../../shared/dashboard-snapshot'
import { workspaceStatusOf } from './office-agents'
import type { OfficeWorkspaceStatus } from './office-status-notes'

/** A workspace of a project floor, which keeps a desk with its plaque even with nobody at work in it. */
export type FloorWorkspace = {
  floorId: string
  worktreeId: string
  name: string
  review?: DashboardCardReview
  status?: OfficeWorkspaceStatus
  /** Nothing runs in it: no terminal, browser or agent, which Orca shows with a moon. */
  asleep: boolean
}

const NO_WORKSPACES: readonly DashboardWorkspace[] = []

function visibleKey(w: FloorWorkspace): string {
  return [
    w.floorId,
    w.worktreeId,
    w.name,
    w.review ? `${w.review.number}${w.review.state}` : '',
    w.status ? `${w.status.id}=${w.status.label}=${w.status.color ?? ''}` : '',
    w.asleep ? 'asleep' : ''
  ].join(':')
}

/** Every open workspace of the office's floors, rebuilt only when what their plaques show changes. */
export function useFloorWorkspaces(
  workspaces: readonly DashboardWorkspace[] = NO_WORKSPACES
): FloorWorkspace[] {
  // Why: a joined string stays equal while the same workspaces sleep, so other store changes do not re-render.
  const sleeping = useAppStore((s) =>
    workspaces
      .filter(({ worktreeId }) => selectIsSleepingWorktree(s, worktreeId))
      .map(({ worktreeId }) => worktreeId)
      .join('\n')
  )
  const asleep = new Set(sleeping.split('\n'))
  const fresh = workspaces.map((workspace) => ({
    floorId: workspace.repoId,
    worktreeId: workspace.worktreeId,
    name: workspace.worktreeName,
    review: workspace.review,
    status: workspaceStatusOf(workspace),
    asleep: asleep.has(workspace.worktreeId)
  }))
  const key = fresh.map(visibleKey).join('|')
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the visible fields above
  return useMemo(() => fresh, [key])
}
