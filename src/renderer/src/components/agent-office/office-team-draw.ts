import { useEffect, useMemo } from 'react'
import { BUNDLED_PETS } from '../pet/pet-models'
import type { OfficeAgent } from './office-agents'
import type { FloorTeams } from './office-floor-teams'

const AGENT_PETS_KEY = 'orca.agentOffice.agentPets'
/** Enough to outlive many sessions without letting the saved draws grow forever. */
const REMEMBERED_LIMIT = 300

let remembered: Map<string, string> | null = null

function readRemembered(): Map<string, string> {
  try {
    const raw = window.localStorage.getItem(AGENT_PETS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    const entries = Object.entries(typeof parsed === 'object' && parsed ? parsed : {})
    return new Map(
      entries.flatMap(([key, petId]): [string, string][] =>
        typeof petId === 'string' && petId.length > 0 ? [[key, petId]] : []
      )
    )
  } catch {
    return new Map()
  }
}

function rememberedPets(): Map<string, string> {
  remembered ??= readRemembered()
  return remembered
}

function rememberDraw(drawn: ReadonlyMap<string, string>): void {
  const memory = rememberedPets()
  const fresh = [...drawn].filter(([key, petId]) => memory.get(key) !== petId)
  if (fresh.length === 0) {
    return
  }
  for (const [key, petId] of fresh) {
    // Why: re-inserting keeps the newest draws last, so trimming drops the oldest.
    memory.delete(key)
    memory.set(key, petId)
  }
  for (const key of [...memory.keys()].slice(0, Math.max(0, memory.size - REMEMBERED_LIMIT))) {
    memory.delete(key)
  }
  try {
    window.localStorage.setItem(AGENT_PETS_KEY, JSON.stringify(Object.fromEntries(memory)))
  } catch {
    // The draw still holds for this visit.
  }
}

// Why: a hash of the agent stands in for the coin toss, so drawing again never changes anyone's pet.
export function toss(key: string, sides: number): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0) % sides
}

/**
 * Agents on a floor with a team keep the team pet they had, or draw one of the least-used ones.
 * A spawned agent never draws its parent's pet; with no other pet on the team it is left undrawn.
 */
export function drawTeamPets(
  agents: readonly OfficeAgent[],
  teams: FloorTeams,
  memory: ReadonlyMap<string, string>
): Map<string, string> {
  const drawn = new Map<string, string>()
  for (const [floorId, team] of Object.entries(teams)) {
    const onFloor = agents.filter((agent) => agent.floorId === floorId)
    const uses = new Map(team.map((petId) => [petId, 0]))
    const allowed = (agent: OfficeAgent): string[] => {
      const parentPet = agent.parentKey ? drawn.get(agent.parentKey) : undefined
      return team.filter((petId) => petId !== parentPet)
    }
    const keep = (key: string, petId: string): void => {
      drawn.set(key, petId)
      uses.set(petId, (uses.get(petId) ?? 0) + 1)
    }
    const drawGroup = (group: readonly OfficeAgent[]): void => {
      const newcomers = group.filter((agent) => {
        const had = memory.get(agent.key)
        if (had !== undefined && allowed(agent).includes(had)) {
          keep(agent.key, had)
          return false
        }
        return true
      })
      for (const agent of newcomers) {
        const pool = allowed(agent)
        const fewest = Math.min(...pool.map((petId) => uses.get(petId) ?? 0))
        const free = pool.filter((petId) => uses.get(petId) === fewest)
        if (free.length > 0) {
          keep(agent.key, free[toss(agent.key, free.length)])
        }
      }
    }
    // Why: parents draw first, so the agents they spawned can steer clear of their pets.
    drawGroup(onFloor.filter((agent) => !agent.parentKey))
    drawGroup(onFloor.filter((agent) => agent.parentKey))
  }
  return drawn
}

// Why: with no team pet left, a spawned agent wears its kind's pet, or another of Orca's if that matches too.
function apartFromParents(agents: readonly OfficeAgent[]): OfficeAgent[] {
  const petOf = new Map(agents.map((agent) => [agent.key, agent.petId]))
  return agents.map((agent) => {
    const parentPet = agent.parentKey ? petOf.get(agent.parentKey) : undefined
    if (parentPet === undefined || agent.petId !== parentPet) {
      return agent
    }
    const others = BUNDLED_PETS.map((pet) => pet.id).filter((petId) => petId !== parentPet)
    return others.length > 0 ? { ...agent, petId: others[toss(agent.key, others.length)] } : agent
  })
}

/** Dresses agents on team floors in their drawn pets and remembers each draw on this computer. */
export function useTeamPets(agents: OfficeAgent[], teams: FloorTeams): OfficeAgent[] {
  const drawn = useMemo(() => drawTeamPets(agents, teams, rememberedPets()), [agents, teams])
  useEffect(() => rememberDraw(drawn), [drawn])
  return useMemo(
    () =>
      apartFromParents(
        agents.map((agent) => {
          const petId = drawn.get(agent.key)
          return petId && petId !== agent.petId ? { ...agent, petId } : agent
        })
      ),
    [agents, drawn]
  )
}
