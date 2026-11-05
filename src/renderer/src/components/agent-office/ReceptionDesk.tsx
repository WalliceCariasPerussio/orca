import { useEffect, useRef } from 'react'
import { Bell, FolderPlus, Plus, Store, Users, X } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { Button } from '../ui/button'
import { openWorkspaceCreationComposerWithTourHandoff } from '../contextual-tours/workspace-creation-tour-handoff'
import { useAgentBucketCounts } from '../dashboard/useAgentBucketCounts'
import SidebarWorkspaceOptionsMenu from '../sidebar/worktree-list/controls/SidebarWorkspaceOptionsMenu'

type ReceptionDeskProps = {
  /** CSS point just in front of the counter; the menu hangs below it. */
  anchor: { left: number; top: number }
  onClose: () => void
  onOpenStaffPets: () => void
  onOpenShop: () => void
}

const ROW =
  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring'

/** What the Projects header buttons do, asked of the receptionist instead. */
export default function ReceptionDesk({
  anchor,
  onClose,
  onOpenStaffPets,
  onOpenShop
}: ReceptionDeskProps): React.JSX.Element {
  const firstRef = useRef<HTMLButtonElement>(null)
  const counts = useAgentBucketCounts()
  const activityOpen = useAppStore((s) => (s.sidebarBody ?? 'workspaces') === 'agents')
  const setSidebarBody = useAppStore((s) => s.setSidebarBody)
  const openModal = useAppStore((s) => s.openModal)
  useEffect(() => {
    firstRef.current?.focus()
  }, [])
  const title = translate('auto.components.agentOffice.reception.desk.title', 'Reception desk')
  return (
    <div
      role="dialog"
      aria-label={title}
      className="absolute z-10 w-72 -translate-x-1/2 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-floating"
      style={{ left: anchor.left, top: anchor.top }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          // Why: the page closes on Escape; here it only ends the conversation.
          event.preventDefault()
          event.stopPropagation()
          onClose()
        }
      }}
    >
      <div className="flex items-center justify-between gap-2 py-0.5 pr-0.5 pl-2">
        <p className="text-xs text-muted-foreground">
          {translate('auto.components.agentOffice.reception.desk.greeting', 'Hi! How can I help?')}
        </p>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={translate('auto.components.agentOffice.reception.desk.close', 'Close')}
          onClick={onClose}
        >
          <X />
        </Button>
      </div>
      <button
        ref={firstRef}
        type="button"
        className={ROW}
        onClick={() => {
          setSidebarBody?.(activityOpen ? 'workspaces' : 'agents')
          onClose()
        }}
      >
        <Bell className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          {activityOpen
            ? translate(
                'auto.components.agentOffice.reception.desk.activityClose',
                'Hide agent activity'
              )
            : translate(
                'auto.components.agentOffice.reception.desk.activity',
                'See agent activity'
              )}
          <span className="block text-xs text-muted-foreground">
            {translate(
              'auto.components.agentOffice.reception.desk.activityCounts',
              '{{value0}} need you · {{value1}} working',
              { value0: counts.attention, value1: counts.working }
            )}
          </span>
        </span>
      </button>
      <div className="flex items-center gap-2 px-2 py-1 text-sm">
        <span className="min-w-0 flex-1">
          {translate('auto.components.agentOffice.reception.desk.options', 'List display options')}
        </span>
        <SidebarWorkspaceOptionsMenu />
      </div>
      <button
        type="button"
        className={ROW}
        onClick={() => {
          openModal('add-repo')
          onClose()
        }}
      >
        <FolderPlus className="size-3.5 shrink-0 text-muted-foreground" />
        {translate('auto.components.agentOffice.reception.desk.addProject', 'Add project')}
      </button>
      <button
        type="button"
        className={ROW}
        onClick={() => {
          onClose()
          openWorkspaceCreationComposerWithTourHandoff()
        }}
      >
        <Plus className="size-3.5 shrink-0 text-muted-foreground" />
        {translate('auto.components.agentOffice.reception.desk.newWorkspace', 'New workspace')}
      </button>
      <div className="my-1 border-t border-border" />
      <button type="button" className={ROW} onClick={onOpenStaffPets}>
        <Users className="size-3.5 shrink-0 text-muted-foreground" />
        {translate('auto.components.agentOffice.reception.desk.staffPets', 'Team pets')}
      </button>
      <button type="button" className={ROW} onClick={onOpenShop}>
        <Store className="size-3.5 shrink-0 text-muted-foreground" />
        {translate('auto.components.agentOffice.reception.desk.shop', 'Pet shop')}
      </button>
    </div>
  )
}
