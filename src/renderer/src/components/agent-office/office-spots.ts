import { FIGURE_HEIGHT } from './office-figures'
import type { TilePoint, WorldPoint } from './office-walker'
import { TEAM_BOARD, TEAM_BOARD_FRONT_TILE } from './project-floor-layout'
import { RECEPTION_COUNTER_FRONT_TILE, RECEPTIONIST_FEET } from './reception-layout'
import { TILE_SIZE } from './vendor/pixel-agents/webview-ui/src/office/types'

export type OfficeSpotId = 'reception' | 'teamBoard' | 'freeDesk'

/** A clicked spot: where you walk to use it, and where its hover label points. */
export type SpotHit = {
  id: OfficeSpotId
  front: TilePoint
  /** Only for spots nobody would guess are clickable. */
  tip?: WorldPoint
}

/** Something in a room you click to use: you walk up to it while its window opens. */
type OfficeSpot = SpotHit & {
  inLobby: boolean
  contains: (world: WorldPoint) => boolean
}

const HIT_HALF_WIDTH = 9

const SPOTS: readonly OfficeSpot[] = [
  {
    id: 'reception',
    inLobby: true,
    front: RECEPTION_COUNTER_FRONT_TILE,
    contains: (world) => {
      const dy = RECEPTIONIST_FEET.y - world.y
      return (
        Math.abs(world.x - RECEPTIONIST_FEET.x) <= HIT_HALF_WIDTH && dy >= -2 && dy <= FIGURE_HEIGHT
      )
    }
  },
  {
    id: 'teamBoard',
    inLobby: false,
    front: TEAM_BOARD_FRONT_TILE,
    contains: (world) => {
      const col = Math.floor(world.x / TILE_SIZE) - TEAM_BOARD.col
      const row = Math.floor(world.y / TILE_SIZE) - TEAM_BOARD.row
      return col >= 0 && col < TEAM_BOARD.tiles && row >= 0 && row < TEAM_BOARD.tiles
    },
    tip: {
      x: (TEAM_BOARD.col + TEAM_BOARD.tiles / 2) * TILE_SIZE,
      y: TEAM_BOARD.row * TILE_SIZE + 7
    }
  }
]

/** The spot under a world point on the lobby or on a project floor. */
export function spotAt(inLobby: boolean, world: WorldPoint): OfficeSpot | null {
  return SPOTS.find((spot) => spot.inLobby === inLobby && spot.contains(world)) ?? null
}
