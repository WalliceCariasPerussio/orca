import { useMemo } from 'react'
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
}

const NO_WORKSPACES: readonly DashboardWorkspace[] = []

function visibleKey(w: FloorWorkspace): string {
  return [
    w.floorId,
    w.worktreeId,
    w.name,
    w.review ? `${w.review.number}${w.review.state}` : '',
    w.status ? `${w.status.id}=${w.status.label}=${w.status.color ?? ''}` : ''
  ].join(':')
}

/** Every open workspace of the office's floors, rebuilt only when what their plaques show changes. */
export function useFloorWorkspaces(
  workspaces: readonly DashboardWorkspace[] = NO_WORKSPACES
): FloorWorkspace[] {
  const fresh = workspaces.map((workspace) => ({
    floorId: workspace.repoId,
    worktreeId: workspace.worktreeId,
    name: workspace.worktreeName,
    review: workspace.review,
    status: workspaceStatusOf(workspace)
  }))
  const key = fresh.map(visibleKey).join('|')
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the visible fields above
  return useMemo(() => fresh, [key])
}
