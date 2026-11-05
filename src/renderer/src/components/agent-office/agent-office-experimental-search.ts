import type { SettingsSearchEntry } from '../settings/search/settings-search'
import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from '../settings/search/settings-search-keywords'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'

export const getAgentOfficeExperimentalSearchEntry = createLocalizedCatalog(
  (): SettingsSearchEntry => ({
    title: translate('auto.components.agentOffice.experimental.title', 'Agent Office'),
    description: translate(
      'auto.components.agentOffice.experimental.description',
      'Office page where each agent shows up as a person at work.'
    ),
    keywords: [
      ...translateSearchKeyword(
        'auto.components.settings.experimental.search.0d24759f14',
        'experimental'
      ),
      ...translateSearchKeyword('auto.components.agentOffice.experimental.keywordOffice', 'office'),
      ...translateSearchKeyword('auto.components.agentOffice.experimental.keywordAgents', 'agents'),
      ...translateSearchKeyword('auto.components.agentOffice.experimental.keyword3d', '3d')
    ]
  })
)
