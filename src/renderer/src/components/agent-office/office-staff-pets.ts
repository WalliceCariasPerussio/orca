import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_PET_ID, GREMLIN_PET_ID, OPENCODE_PET_ID } from '../pet/pet-models'

export type StaffRole = 'claude' | 'codex' | 'opencode' | 'other'
export type StaffPets = Record<StaffRole, string>

export const STAFF_ROLES: readonly StaffRole[] = ['claude', 'codex', 'opencode', 'other']

const STAFF_PETS_KEY = 'orca.agentOffice.staffPets'

export const DEFAULT_STAFF_PETS: StaffPets = {
  claude: DEFAULT_PET_ID,
  codex: GREMLIN_PET_ID,
  opencode: OPENCODE_PET_ID,
  other: GREMLIN_PET_ID
}

export function roleForAgentType(agentType: string): StaffRole {
  if (agentType.includes('claude')) {
    return 'claude'
  }
  if (agentType.includes('codex')) {
    return 'codex'
  }
  if (agentType.includes('opencode')) {
    return 'opencode'
  }
  return 'other'
}

// Why: the choice is a per-computer convenience; storage can fail and the defaults still work.
function readStaffPets(): StaffPets {
  try {
    const raw = window.localStorage.getItem(STAFF_PETS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    const saved = new Map(typeof parsed === 'object' && parsed ? Object.entries(parsed) : [])
    const pets = { ...DEFAULT_STAFF_PETS }
    for (const role of STAFF_ROLES) {
      const value: unknown = saved.get(role)
      if (typeof value === 'string' && value.length > 0) {
        pets[role] = value
      }
    }
    return pets
  } catch {
    return { ...DEFAULT_STAFF_PETS }
  }
}

function writeStaffPets(pets: StaffPets): void {
  try {
    window.localStorage.setItem(STAFF_PETS_KEY, JSON.stringify(pets))
  } catch {
    // Keep the choice for this visit even when it cannot be saved.
  }
}

/** Which pet each kind of agent wears, saved on this computer. */
export function useStaffPets(): [StaffPets, (role: StaffRole, petId: string) => void] {
  const [pets, setPets] = useState(readStaffPets)
  useEffect(() => writeStaffPets(pets), [pets])
  const assign = useCallback((role: StaffRole, petId: string) => {
    setPets((current) => ({ ...current, [role]: petId }))
  }, [])
  return [pets, assign]
}
