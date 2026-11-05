import { Building2 } from 'lucide-react'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'

export default function AgentOfficeSidebarEntry(): React.JSX.Element {
  const active = useAppStore((s) => s.activeView === 'office')
  const openAgentOfficePage = useAppStore((s) => s.openAgentOfficePage)

  return (
    <button
      type="button"
      onClick={openAgentOfficePage}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium tracking-tight transition-colors',
        active
          ? 'bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground'
          : 'text-worktree-sidebar-foreground/60 hover:bg-worktree-sidebar-foreground/8'
      )}
    >
      <Building2
        className={cn('size-4 shrink-0', !active && 'text-worktree-sidebar-foreground/30')}
        strokeWidth={active ? 2.25 : 1.75}
      />
      <span className="flex-1">
        {translate('auto.components.agentOffice.sidebar.label', 'Agent Office')}
      </span>
    </button>
  )
}
