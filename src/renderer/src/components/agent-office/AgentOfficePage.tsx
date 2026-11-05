import { useEffect } from 'react'
import { ArrowLeft, Building2 } from 'lucide-react'
import { Button } from '../ui/button'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { useMobilePageEscape } from '../mobile/use-mobile-page-escape'

export default function AgentOfficePage(): React.JSX.Element {
  const enabled = useAppStore((s) => s.settings?.experimentalAgentOffice === true)
  const closeAgentOfficePage = useAppStore((s) => s.closeAgentOfficePage)
  useMobilePageEscape(closeAgentOfficePage)

  // Why: a restored 'office' view must not outlive the experimental toggle.
  useEffect(() => {
    if (!enabled) {
      closeAgentOfficePage()
    }
  }, [enabled, closeAgentOfficePage])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background p-3">
      <Button variant="ghost" size="xs" onClick={closeAgentOfficePage} className="mb-2 w-fit">
        <ArrowLeft className="size-3.5" />
        {translate('auto.components.agentOffice.page.back', 'Back')}
      </Button>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <Building2 className="size-8 text-muted-foreground" strokeWidth={1.5} />
        <h1 className="text-base font-semibold">
          {translate('auto.components.agentOffice.page.title', 'Agent Office')}
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {translate(
            'auto.components.agentOffice.page.placeholder',
            'Each agent will show up here as a person at work. This page is under construction.'
          )}
        </p>
      </div>
    </div>
  )
}
