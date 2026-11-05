import { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../ui/button'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { useMobilePageEscape } from '../mobile/use-mobile-page-escape'
import AgentOfficeBuilding from './AgentOfficeBuilding'

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
      <h1 className="sr-only">
        {translate('auto.components.agentOffice.page.title', 'Agent Office')}
      </h1>
      <AgentOfficeBuilding />
    </div>
  )
}
