import { useEffect, useState } from 'react'
import { useAppStore } from '@/store'
import { BUNDLED_PETS } from '../pet/pet-models'
import type { PetSprite } from './office-pet-sprite'
import { loadInstalledPet } from './use-office-cast'

export type PetChoice = { id: string; label: string }

/** Every pet installed on this computer: Orca's own, then yours. */
export function usePetChoices(): PetChoice[] {
  const customPets = useAppStore((s) => s.customPets)
  return [
    ...BUNDLED_PETS.map((pet) => ({ id: pet.id, label: pet.label })),
    ...customPets.map((pet) => ({ id: pet.id, label: pet.label }))
  ]
}

/** The choices' sprites as they load, so a picker can show each pet. */
export function usePetSprites(choices: readonly PetChoice[]): ReadonlyMap<string, PetSprite> {
  const customPets = useAppStore((s) => s.customPets)
  const [sprites, setSprites] = useState<ReadonlyMap<string, PetSprite>>(new Map())
  const idsKey = choices.map((choice) => choice.id).join('\n')
  useEffect(() => {
    let cancelled = false
    const ids = idsKey ? idsKey.split('\n') : []
    void Promise.all(
      ids.map(async (id) => [id, await loadInstalledPet(id, customPets).catch(() => null)] as const)
    ).then((loaded) => {
      if (!cancelled) {
        setSprites(
          new Map(
            loaded.flatMap(([id, sprite]): [string, PetSprite][] => (sprite ? [[id, sprite]] : []))
          )
        )
      }
    })
    return () => {
      cancelled = true
    }
  }, [idsKey, customPets])
  return sprites
}
