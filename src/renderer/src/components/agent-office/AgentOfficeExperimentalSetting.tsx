import type { GlobalSettings } from '../../../../shared/global-settings-types'
import { translate } from '@/i18n/i18n'
import { Label } from '../ui/label'
import { SearchableSetting } from '../settings/section-layout/SearchableSetting'
import { SettingsSwitch } from '../settings/form-controls/SettingsFormControls'
import { getAgentOfficeExperimentalSearchEntry } from './agent-office-experimental-search'

export function AgentOfficeExperimentalSetting({
  settings,
  updateSettings
}: {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}): React.JSX.Element {
  const entry = getAgentOfficeExperimentalSearchEntry()
  const enabled = settings.experimentalAgentOffice === true
  return (
    <SearchableSetting
      title={entry.title}
      description={entry.description}
      keywords={entry.keywords}
      className="flex items-start justify-between gap-4 py-2"
      id="experimental-agent-office"
    >
      <div className="min-w-0 shrink space-y-0.5">
        <Label>{entry.title}</Label>
        <p className="text-xs text-muted-foreground">
          {translate(
            'auto.components.agentOffice.experimental.copy',
            'Adds an Agent Office entry to the left sidebar. The office shows each agent as a person at work. Early prototype.'
          )}
        </p>
      </div>
      <SettingsSwitch
        checked={enabled}
        ariaLabel={translate(
          'auto.components.agentOffice.experimental.toggleLabel',
          'Toggle Agent Office'
        )}
        onChange={() => updateSettings({ experimentalAgentOffice: !enabled })}
      />
    </SearchableSetting>
  )
}
