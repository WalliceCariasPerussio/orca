/** One pet listed by the codex-pets.net catalog, trimmed to what the picker shows. */
export type PetCatalogEntry = {
  id: string
  displayName: string
  description: string
  ownerHandle: string | null
  tags: string[]
  /** Still image of the pet, served by the catalog; null when it has none. */
  posterUrl: string | null
}

export type PetCatalogPage = {
  pets: PetCatalogEntry[]
  page: number
  totalPages: number
}

export type PetCatalogQuery = {
  page: number
  search: string
}
