import { useCallback, useEffect, useRef, useState } from 'react'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import type { PetApi } from '../../../../preload/api/pet-api'
import type {
  PetCatalogEntry,
  PetCatalogPage,
  PetCatalogQuery
} from '../../../../shared/pet-catalog-types'
import { isPetImportFailure } from '../../../../shared/pet-import-failure-copy'
import type { CustomPet } from '../../../../shared/pet-types'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { petImportFailureText } from '../pet/pet-import-failure-text'
import OfficePanel from './OfficePanel'

type PetCatalog = {
  catalogList?: (query: PetCatalogQuery) => Promise<unknown>
  catalogInstall?: PetApi['catalogInstall']
}

type PetShopPanelProps = {
  onClose: () => void
  /** Defaults to the desktop bridge; fixtures pass a stand-in catalog. */
  catalog?: PetCatalog
}

type Listing = { pets: PetCatalogEntry[]; page: number; totalPages: number; query: string }

function isCatalogPage(value: unknown): value is PetCatalogPage {
  return typeof value === 'object' && value !== null && 'pets' in value && Array.isArray(value.pets)
}

/** Browse codex-pets.net and install pets on this computer only. */
export default function PetShopPanel({
  onClose,
  catalog = window.api?.pet
}: PetShopPanelProps): React.JSX.Element {
  const addCustomPet = useAppStore((s) => s.addCustomPet)
  const setPetId = useAppStore((s) => s.setPetId)
  const petId = useAppStore((s) => s.petId)
  // Why: the web client answers every bridge call, so only a real page proves the catalog is reachable here.
  const [supported, setSupported] = useState(
    Boolean(catalog?.catalogList && catalog.catalogInstall)
  )
  const [search, setSearch] = useState('')
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [installing, setInstalling] = useState<string | null>(null)
  const [installed, setInstalled] = useState<Record<string, CustomPet>>({})
  // Why: only the newest search may fill the list; an older answer arriving late is dropped.
  const latestRequest = useRef(0)

  const load = useCallback(
    async (page: number, query: string, append: boolean) => {
      if (!catalog?.catalogList) {
        return
      }
      const request = ++latestRequest.current
      setLoading(true)
      setError(null)
      try {
        const result = await catalog.catalogList({ page, search: query })
        if (request !== latestRequest.current) {
          return
        }
        if (!isCatalogPage(result)) {
          setSupported(false)
          return
        }
        setListing((previous) => ({
          ...result,
          query,
          pets: append && previous ? [...previous.pets, ...result.pets] : result.pets
        }))
      } catch {
        if (request === latestRequest.current) {
          setError(
            translate(
              'auto.components.agentOffice.shop.listFailed',
              'Could not reach codex-pets.net. Check your connection and try again.'
            )
          )
        }
      } finally {
        if (request === latestRequest.current) {
          setLoading(false)
        }
      }
    },
    [catalog]
  )

  useEffect(() => {
    void load(1, '', false)
  }, [load])

  const install = async (entry: PetCatalogEntry): Promise<void> => {
    if (!catalog?.catalogInstall) {
      return
    }
    setInstalling(entry.id)
    setError(null)
    try {
      const result = await catalog.catalogInstall(entry.id)
      if (result && isPetImportFailure(result)) {
        setError(petImportFailureText(result))
      } else if (result) {
        addCustomPet(result)
        setInstalled((current) => ({ ...current, [entry.id]: result }))
      }
    } catch {
      setError(
        translate('auto.components.agentOffice.shop.installFailed', 'Could not install this pet.')
      )
    } finally {
      setInstalling(null)
    }
  }

  return (
    <OfficePanel
      title={translate('auto.components.agentOffice.shop.title', 'Pet shop')}
      onClose={onClose}
    >
      <p className="mb-3 text-xs text-muted-foreground">
        {translate(
          'auto.components.agentOffice.shop.notice',
          'Community pets from codex-pets.net, installed on this computer only. Many are fan art of other people’s characters, so install only pets you are free to use.'
        )}
      </p>
      {supported ? (
        <form
          className="mb-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void load(1, search, false)
          }}
        >
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={translate('auto.components.agentOffice.shop.search', 'Search pets')}
            aria-label={translate('auto.components.agentOffice.shop.search', 'Search pets')}
          />
          <Button type="submit" variant="outline" disabled={loading}>
            {translate('auto.components.agentOffice.shop.searchButton', 'Search')}
          </Button>
        </form>
      ) : (
        <p className="text-sm">
          {translate(
            'auto.components.agentOffice.shop.unsupported',
            'Installing pets needs the desktop app after a full restart.'
          )}
        </p>
      )}
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {listing?.pets.map((entry) => {
          const done = installed[entry.id]
          return (
            <li
              key={entry.id}
              className="flex flex-col gap-1.5 rounded-lg border border-border p-2"
            >
              <div className="flex h-24 items-center justify-center">
                {entry.posterUrl ? (
                  <img
                    src={entry.posterUrl}
                    alt=""
                    loading="lazy"
                    className="max-h-24 max-w-full object-contain"
                  />
                ) : null}
              </div>
              <p className="truncate text-sm font-medium" title={entry.description}>
                {entry.displayName}
              </p>
              {entry.ownerHandle ? (
                <p className="truncate text-xs text-muted-foreground">@{entry.ownerHandle}</p>
              ) : null}
              {done ? (
                <Button
                  size="xs"
                  variant="outline"
                  disabled={petId === done.id}
                  onClick={() => setPetId(done.id)}
                >
                  {petId === done.id
                    ? translate('auto.components.agentOffice.shop.isYou', 'This is you')
                    : translate('auto.components.agentOffice.shop.useAsMe', 'Use as my pet')}
                </Button>
              ) : (
                <Button
                  size="xs"
                  disabled={installing !== null}
                  onClick={() => void install(entry)}
                >
                  {installing === entry.id
                    ? translate('auto.components.agentOffice.shop.installing', 'Installing…')
                    : translate('auto.components.agentOffice.shop.install', 'Install')}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      {listing && listing.page < listing.totalPages ? (
        <div className="mt-3 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => void load(listing.page + 1, listing.query, true)}
          >
            {translate('auto.components.agentOffice.shop.more', 'Show more')}
          </Button>
        </div>
      ) : null}
      {loading && !listing ? (
        <p className="text-sm text-muted-foreground">
          {translate('auto.components.agentOffice.shop.loading', 'Loading pets…')}
        </p>
      ) : null}
    </OfficePanel>
  )
}
