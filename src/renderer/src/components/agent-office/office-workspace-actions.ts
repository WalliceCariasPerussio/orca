import { useAppStore } from '@/store'
import type { Worktree } from '../../../../shared/worktree/types'
import { parseWorkspaceKey } from '../../../../shared/workspace-scope'
import {
  createWorktreeContextMenuDeleteIntent,
  runWorktreeContextMenuDeleteIntent
} from '../sidebar/workspace-actions/context-menu/worktree-context-menu-delete-intent'
import { runSleepWorktrees } from '../sidebar/workspace-actions/sleep/sleep-worktree-flow'
import { collectTwinHostsAlsoSlept } from '../sidebar/workspace-actions/sleep/sleep-twin-confirmation'

/** Puts a workspace to sleep the way its sidebar menu does, asking first when twins on other hosts would sleep too. */
export function sleepWorkspace(worktree: Worktree): void {
  const state = useAppStore.getState()
  const hostIds = collectTwinHostsAlsoSlept(state, [worktree])
  if (hostIds.length > 0) {
    state.openModal('confirm-sleep-twin', { worktreeIds: [worktree.id], hostIds })
    return
  }
  void runSleepWorktrees([worktree.id])
}

/** Deletes a workspace through Orca's own flow, which confirms and guards unsaved work first. */
export function deleteWorkspace(worktree: Worktree): void {
  const scope = parseWorkspaceKey(worktree.id)
  const intent = createWorktreeContextMenuDeleteIntent({
    worktree,
    batchDeleteWorktrees: [],
    isMultiContext: false,
    ...(scope?.type === 'folder' ? { folderWorkspaceId: scope.folderWorkspaceId } : {})
  })
  runWorktreeContextMenuDeleteIntent(intent)
}
