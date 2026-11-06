import { useEffect, useRef } from 'react'
import { useWorktreeById } from '@/store/selectors'
import type { ExecutionHostId } from '../../../../shared/execution-host'
import WorktreeContextMenu from '../sidebar/workspace-actions/context-menu/WorktreeContextMenu'

/** Which workspace's menu to open, and where, in CSS pixels relative to the office. */
export type OfficeWorkspaceMenuAt = {
  worktreeId: string
  executionHostId?: ExecutionHostId
  left: number
  top: number
}

/** Orca's own workspace menu, the one a right-click opens on the sidebar card, here at a desk. */
export default function OfficeWorkspaceMenu({
  at,
  onClose
}: {
  at: OfficeWorkspaceMenuAt
  onClose: () => void
}): React.JSX.Element | null {
  const worktree = useWorktreeById(at.worktreeId, at.executionHostId)
  const anchorRef = useRef<HTMLSpanElement>(null)
  // Why: the menu reports itself closed when it mounts; only a close after it opened ends it.
  const openedRef = useRef(false)
  const found = worktree !== null && worktree !== undefined
  useEffect(() => {
    const anchor = anchorRef.current
    if (!found || !anchor) {
      return
    }
    // Why: the menu opens on a right-click inside the card it wraps; this one wraps a point at the desk.
    const box = anchor.getBoundingClientRect()
    anchor.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        button: 2,
        clientX: box.left,
        clientY: box.top
      })
    )
  }, [found, at.left, at.top])
  if (!worktree) {
    return null
  }
  return (
    <div className="absolute" style={{ left: at.left, top: at.top }}>
      <WorktreeContextMenu
        worktree={worktree}
        onOpenChange={(open) => {
          if (open) {
            openedRef.current = true
          } else if (openedRef.current) {
            onClose()
          }
        }}
      >
        <span ref={anchorRef} className="block size-px" />
      </WorktreeContextMenu>
    </div>
  )
}
