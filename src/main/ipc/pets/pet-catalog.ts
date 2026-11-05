import { app, net } from 'electron'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { unzipSync } from 'fflate'
import { z } from 'zod'
import type {
  PetCatalogEntry,
  PetCatalogPage,
  PetCatalogQuery
} from '../../../shared/pet-catalog-types'
import type { CustomPet } from '../../../shared/pet-types'
import { readWebpDimensionsFromBuffer } from './pet-bundle'
import { importPetBundleFromDirectory } from './pet-bundle-import'

const CATALOG_ORIGIN = 'https://codex-pets.net'
const CATALOG_HOST = 'codex-pets.net'
const PAGE_SIZE = 24
const MAX_SEARCH_LENGTH = 80
const MAX_PAGE = 1000
const MAX_LIST_BYTES = 2 * 1024 * 1024
const MAX_ZIP_BYTES = 16 * 1024 * 1024
const MAX_UNPACKED_BYTES = 24 * 1024 * 1024
// Why: Codex sheets are at most 1536x2288; a larger sheet only costs memory when the office decodes it.
const MAX_SHEET_SIDE = 4096
const REQUEST_TIMEOUT_MS = 30_000
const PET_ID = /^[a-z0-9][a-z0-9_-]{0,119}$/i
// Why: a catalog pet is exactly these two files; fixed names mean nothing in the archive picks a path.
const BUNDLE_FILES = new Set(['pet.json', 'spritesheet.webp'])

const CatalogListSchema = z.object({
  pets: z.array(
    z.object({
      id: z.string(),
      displayName: z.string().optional(),
      description: z.string().optional(),
      ownerHandle: z.string().nullable().optional(),
      tags: z.array(z.string()).optional(),
      posterUrl: z.string().nullable().optional()
    })
  ),
  page: z.number().optional(),
  totalPages: z.number().optional()
})

const QuerySchema = z.object({
  page: z.number().int().min(1).max(MAX_PAGE),
  search: z.string().max(MAX_SEARCH_LENGTH)
})

function catalogUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }
  try {
    const url = new URL(value, CATALOG_ORIGIN)
    const ownHost = url.hostname === CATALOG_HOST || url.hostname.endsWith(`.${CATALOG_HOST}`)
    return url.protocol === 'https:' && ownHost ? url.toString() : null
  } catch {
    return null
  }
}

/** GET from the catalog without following redirects, stopping as soon as the body passes `limit`. */
async function fetchBytes(url: string, limit: number): Promise<Uint8Array> {
  const response = await net.fetch(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { 'User-Agent': `Orca/${app.getVersion()} (agent-office pet picker)` }
  })
  if (!response.ok || !response.body) {
    throw new Error(`The pet catalog answered ${response.status}.`)
  }
  if (Number(response.headers.get('content-length') ?? 0) > limit) {
    throw new Error('The pet is too large to install.')
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    total += value.byteLength
    if (total > limit) {
      await reader.cancel()
      throw new Error('The pet is too large to install.')
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

export async function listPetCatalog(query: PetCatalogQuery): Promise<PetCatalogPage> {
  const { page, search } = QuerySchema.parse(query)
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
    sort: 'popular',
    content: 'safe'
  })
  if (search.trim()) {
    params.set('q', search.trim())
  }
  const bytes = await fetchBytes(`${CATALOG_ORIGIN}/api/pets?${params}`, MAX_LIST_BYTES)
  const parsed = CatalogListSchema.parse(JSON.parse(new TextDecoder().decode(bytes)))
  const pets: PetCatalogEntry[] = parsed.pets
    .filter((pet) => PET_ID.test(pet.id))
    .map((pet) => ({
      id: pet.id,
      displayName: (pet.displayName ?? pet.id).slice(0, 60),
      description: (pet.description ?? '').slice(0, 280),
      ownerHandle: pet.ownerHandle ?? null,
      tags: (pet.tags ?? []).slice(0, 8),
      posterUrl: catalogUrl(pet.posterUrl)
    }))
  return { pets, page: parsed.page ?? page, totalPages: parsed.totalPages ?? page }
}

/** Unpack only the first pet.json and spritesheet.webp, bounded in total before anything inflates. */
function unpackBundle(archive: Uint8Array): Map<string, Uint8Array> {
  const accepted = new Set<string>()
  let unpacked = 0
  const entries = unzipSync(archive, {
    filter: (file) => {
      const name = file.name.split('/').at(-1) ?? ''
      if (!BUNDLE_FILES.has(name) || accepted.has(name)) {
        return false
      }
      unpacked += file.originalSize
      if (unpacked > MAX_UNPACKED_BYTES) {
        throw new Error('The pet is too large to install.')
      }
      accepted.add(name)
      return true
    }
  })
  const files = new Map<string, Uint8Array>()
  for (const [entryName, data] of Object.entries(entries)) {
    files.set(entryName.split('/').at(-1) ?? '', data)
  }
  return files
}

/** Download one pet into this computer's pets, through the same checks as a picked folder. */
export async function installPetFromCatalog(id: unknown): Promise<CustomPet> {
  if (typeof id !== 'string' || !PET_ID.test(id)) {
    throw new Error('Invalid pet id.')
  }
  const archive = await fetchBytes(
    `${CATALOG_ORIGIN}/api/pets/${encodeURIComponent(id)}/download`,
    MAX_ZIP_BYTES
  )
  const files = unpackBundle(archive)
  const manifest = files.get('pet.json')
  const sheet = files.get('spritesheet.webp')
  const size = sheet
    ? readWebpDimensionsFromBuffer(Buffer.from(sheet.buffer, sheet.byteOffset, sheet.byteLength))
    : null
  if (!manifest || !sheet || !size || size.width > MAX_SHEET_SIDE || size.height > MAX_SHEET_SIDE) {
    throw new Error('This pet is not a usable Codex pet.')
  }
  const dir = await mkdtemp(join(app.getPath('temp'), 'orca-pet-'))
  try {
    await writeFile(join(dir, 'pet.json'), manifest, { flag: 'wx' })
    await writeFile(join(dir, 'spritesheet.webp'), sheet, { flag: 'wx' })
    return await importPetBundleFromDirectory(dir)
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}
