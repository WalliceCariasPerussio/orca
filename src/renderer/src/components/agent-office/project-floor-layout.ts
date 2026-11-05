import { createRoomLayout } from './office-room-grid'
import type { TilePoint, WorldPoint } from './office-walker'
import {
  TILE_SIZE,
  TileType,
  type ColorValue,
  type OfficeLayout,
  type PlacedFurniture
} from './vendor/pixel-agents/webview-ui/src/office/types'

const DESK_COLS = [2, 6, 10]
const DESK_ROWS = [5, 9, 12]
const MIN_DESK_ROWS = 2
const DEFAULT_WALL_HUE = 210

export const MAX_DESKS = DESK_COLS.length * DESK_ROWS.length

/** The whiteboard on the wall where the floor's team is chosen: two tiles wide and tall. */
export const TEAM_BOARD = { col: 2, row: 0, tiles: 2 }
/** Where you stand to read the team board. */
export const TEAM_BOARD_FRONT_TILE = { col: 3, row: 2 }

/** Where an agent works: the tile it stands on and the point between its feet. */
export type DeskSeat = { tile: TilePoint; feet: WorldPoint }

function hueOf(hex: string | undefined): number {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex ?? '')
  if (!match) {
    return DEFAULT_WALL_HUE
  }
  const value = Number.parseInt(match[1], 16)
  const r = ((value >> 16) & 255) / 255
  const g = ((value >> 8) & 255) / 255
  const b = (value & 255) / 255
  const max = Math.max(r, g, b)
  const delta = max - Math.min(r, g, b)
  if (delta === 0) {
    return DEFAULT_WALL_HUE
  }
  const sector =
    max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4
  return Math.round((sector * 60 + 360) % 360)
}

function deskOrigins(agentCount: number): TilePoint[] {
  const rows = Math.min(
    DESK_ROWS.length,
    Math.max(MIN_DESK_ROWS, Math.ceil(agentCount / DESK_COLS.length))
  )
  return DESK_ROWS.slice(0, rows).flatMap((row) => DESK_COLS.map((col) => ({ col, row })))
}

/** Seats in reading order; agent i sits at seat i. */
export function deskSeats(agentCount: number): DeskSeat[] {
  return deskOrigins(agentCount).map(({ col, row }) => ({
    tile: { col: col + 1, row: row - 1 },
    feet: { x: (col + 1) * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + 18 }
  }))
}

function deskFurniture(agentCount: number): Omit<PlacedFurniture, 'uid'>[] {
  return deskOrigins(agentCount).flatMap(({ col, row }) => [
    { type: 'WOODEN_CHAIR_FRONT', col: col + 1, row: row - 1 },
    { type: 'DESK_FRONT', col, row },
    { type: 'PC_BACK', col: col + 2, row }
  ])
}

/** A project floor: a desk for each agent and the project's color on the walls. */
export function createProjectFloorLayout(
  projectId: string,
  badgeColor: string | undefined,
  agentCount: number
): OfficeLayout {
  const wallColor: ColorValue = { h: hueOf(badgeColor), s: 22, b: -30, c: -20 }
  return createRoomLayout(
    {
      floorTile: TileType.FLOOR_7,
      floorColor: { h: 25, s: 40, b: -20, c: -60 },
      wallColor
    },
    [
      { type: 'WHITEBOARD', col: TEAM_BOARD.col, row: TEAM_BOARD.row },
      { type: 'CLOCK', col: 12, row: 0 },
      { type: 'DOUBLE_BOOKSHELF', col: 17, row: 0 },
      ...deskFurniture(agentCount),
      { type: 'LARGE_PLANT', col: 17, row: 2 },
      { type: 'SOFA_FRONT', col: 15, row: 8 },
      { type: 'COFFEE_TABLE', col: 15, row: 9 },
      { type: 'PLANT', col: 18, row: 8 },
      { type: 'PLANT_2', col: 17, row: 12 },
      { type: 'BIN', col: 14, row: 12 }
    ],
    `floor-${projectId}`
  )
}
