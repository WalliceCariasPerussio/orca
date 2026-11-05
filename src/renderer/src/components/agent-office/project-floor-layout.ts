import { createRoomLayout } from './office-room-grid'
import {
  TileType,
  type ColorValue,
  type OfficeLayout,
  type PlacedFurniture
} from './vendor/pixel-agents/webview-ui/src/office/types'

const DESK_COLS = [2, 6, 10]
const DESK_ROWS = [5, 9]
const DEFAULT_WALL_HUE = 210

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

function deskFurniture(): Omit<PlacedFurniture, 'uid'>[] {
  return DESK_ROWS.flatMap((row) =>
    DESK_COLS.flatMap((col) => [
      { type: 'WOODEN_CHAIR_FRONT', col: col + 1, row: row - 1 },
      { type: 'DESK_FRONT', col, row },
      { type: 'PC_BACK', col: col + 2, row }
    ])
  )
}

/** A project floor: empty desks for its agents and the project's color on the walls. */
export function createProjectFloorLayout(projectId: string, badgeColor?: string): OfficeLayout {
  const wallColor: ColorValue = { h: hueOf(badgeColor), s: 22, b: -30, c: -20 }
  return createRoomLayout(
    {
      floorTile: TileType.FLOOR_7,
      floorColor: { h: 25, s: 40, b: -20, c: -60 },
      wallColor
    },
    [
      { type: 'WHITEBOARD', col: 2, row: 0 },
      { type: 'CLOCK', col: 12, row: 0 },
      { type: 'DOUBLE_BOOKSHELF', col: 17, row: 0 },
      ...deskFurniture(),
      { type: 'LARGE_PLANT', col: 17, row: 2 },
      { type: 'SOFA_FRONT', col: 15, row: 8 },
      { type: 'COFFEE_TABLE', col: 15, row: 9 },
      { type: 'PLANT', col: 18, row: 8 },
      { type: 'PLANT_2', col: 1, row: 11 },
      { type: 'BIN', col: 13, row: 12 }
    ],
    `floor-${projectId}`
  )
}
