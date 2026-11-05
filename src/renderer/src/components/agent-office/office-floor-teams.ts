import { useCallback, useEffect, useState } from 'react'

/** Pet ids that work on each floor, by floor id. A floor without a team dresses agents by kind. */
export type FloorTeams = Readonly<Record<string, readonly string[]>>

const FLOOR_TEAMS_KEY = 'orca.agentOffice.floorTeams'

// Why: the team is a per-computer convenience; storage can fail and every floor still works by kind.
function readFloorTeams(): FloorTeams {
  try {
    const raw = window.localStorage.getItem(FLOOR_TEAMS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    const teams: Record<string, string[]> = {}
    for (const [floorId, value] of Object.entries(
      typeof parsed === 'object' && parsed ? parsed : {}
    )) {
      const pets: unknown[] = Array.isArray(value) ? value : []
      const ids = pets.filter((id): id is string => typeof id === 'string' && id.length > 0)
      if (ids.length > 0) {
        teams[floorId] = [...new Set(ids)]
      }
    }
    return teams
  } catch {
    return {}
  }
}

function writeFloorTeams(teams: FloorTeams): void {
  try {
    window.localStorage.setItem(FLOOR_TEAMS_KEY, JSON.stringify(teams))
  } catch {
    // Keep the team for this visit even when it cannot be saved.
  }
}

/** Which pets work on each floor, saved on this computer. */
export function useFloorTeams(): [
  FloorTeams,
  (floorId: string, petIds: readonly string[]) => void
] {
  const [teams, setTeams] = useState(readFloorTeams)
  useEffect(() => writeFloorTeams(teams), [teams])
  const setTeam = useCallback((floorId: string, petIds: readonly string[]) => {
    setTeams((current) =>
      Object.fromEntries(
        Object.entries({ ...current, [floorId]: petIds }).filter(([, pets]) => pets.length > 0)
      )
    )
  }, [])
  return [teams, setTeam]
}
