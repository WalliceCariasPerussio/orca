import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/store'
import { applyCodexSpriteTimingDefaults } from '../../../../shared/codex-pet-sprite-defaults'
import type { CustomPet } from '../../../../shared/pet-types'
import { loadCustomBlobUrl } from '../pet/pet-blob-cache'
import { BUNDLED_PETS, isBundledPetId } from '../pet/pet-models'
import { usePetUrl } from '../pet/usePetUrl'
import { loadOfficeAssets } from './office-asset-loading'
import { loadElevatorSprite } from './office-elevator'
import { loadPetSprite, retainPetSprites, type PetSprite } from './office-pet-sprite'

export type OfficeCast = {
  avatar: PetSprite
  receptionist: PetSprite | null
  /** Pets the agents wear, by pet id: the bundled ones plus any custom pet given a role. */
  staff: ReadonlyMap<string, PetSprite>
}

type SheetGrid = NonNullable<CustomPet['sprite']>

const PET_WAIT_MS = 1500

async function loadBundledStaff(): Promise<Map<string, PetSprite>> {
  const loaded = await Promise.all(
    BUNDLED_PETS.map(async (pet) => [pet.id, await loadPetSprite(pet.url, null)] as const)
  )
  return new Map(loaded)
}

function usableGrid(sprite: CustomPet['sprite']): SheetGrid | null {
  const grid = sprite ? applyCodexSpriteTimingDefaults(sprite) : null
  return grid && grid.frameWidth > 0 && grid.frameHeight > 0 && grid.fps > 0 ? grid : null
}

async function loadCustomStaff(pet: CustomPet): Promise<readonly [string, PetSprite] | null> {
  const grid = usableGrid(pet.sprite)
  const url = await loadCustomBlobUrl(
    pet.id,
    pet.fileName,
    pet.mimeType,
    pet.kind,
    pet.sprite?.fps ?? pet.spriteFps,
    grid !== null
  )
  return url ? [pet.id, await loadPetSprite(url, grid)] : null
}

/** An installed pet's sprite, Orca's own or yours; null when its file cannot be read. */
export async function loadInstalledPet(
  petId: string,
  customPets: readonly CustomPet[]
): Promise<PetSprite | null> {
  const bundled = BUNDLED_PETS.find((pet) => pet.id === petId)
  if (bundled) {
    return loadPetSprite(bundled.url, null)
  }
  const custom = customPets.find((pet) => pet.id === petId)
  const loaded = custom ? await loadCustomStaff(custom) : null
  return loaded?.[1] ?? null
}

/** Everyone the office draws, loaded once the office art and your pet are ready. */
export function useOfficeCast(staffPetIds: readonly string[]): {
  cast: OfficeCast | null
  failed: boolean
} {
  const [cast, setCast] = useState<OfficeCast | null>(null)
  const [failed, setFailed] = useState(false)
  const pet = usePetUrl()
  // Why: usePetUrl rebuilds the grid object each render; its contents are what should reload frames.
  const gridKey = pet.sprite ? JSON.stringify(pet.sprite) : ''
  const grid = useMemo<SheetGrid | null>(() => (gridKey ? JSON.parse(gridKey) : null), [gridKey])
  const petId = useAppStore((s) => s.petId)
  const customPets = useAppStore((s) => s.customPets)
  const receptionistId = (BUNDLED_PETS.find((p) => p.id !== petId) ?? BUNDLED_PETS[0]).id
  const customStaffKey = [...new Set(staffPetIds.filter((id) => !isBundledPetId(id)))].join(',')
  // Why: a custom pet whose file is missing never turns ready; open with the bundled stand-in meanwhile.
  const [petWaitOver, setPetWaitOver] = useState(false)
  useEffect(() => {
    if (pet.ready) {
      return
    }
    const timer = window.setTimeout(() => setPetWaitOver(true), PET_WAIT_MS)
    return () => window.clearTimeout(timer)
  }, [pet.ready])
  const petUsable = pet.ready || petWaitOver

  useEffect(() => {
    if (!petUsable) {
      return
    }
    let cancelled = false
    const wanted = customPets.filter((p) => customStaffKey.split(',').includes(p.id))
    void Promise.all([
      loadOfficeAssets(),
      loadElevatorSprite(),
      loadPetSprite(pet.url, grid),
      loadBundledStaff(),
      Promise.all(wanted.map((p) => loadCustomStaff(p).catch(() => null)))
    ]).then(
      ([, , avatar, staff, custom]) => {
        if (cancelled) {
          return
        }
        for (const entry of custom) {
          if (entry) {
            staff.set(entry[0], entry[1])
          }
        }
        retainPetSprites([avatar, ...staff.values()])
        setCast({ avatar, receptionist: staff.get(receptionistId) ?? null, staff })
      },
      () => {
        if (!cancelled) {
          setFailed(true)
        }
      }
    )
    return () => {
      cancelled = true
    }
  }, [petUsable, pet.url, grid, receptionistId, customPets, customStaffKey])

  return { cast, failed }
}
