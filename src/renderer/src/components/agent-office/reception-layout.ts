import { createRoomLayout } from './office-room-grid'
import {
  TILE_SIZE,
  TileType,
  type OfficeLayout
} from './vendor/pixel-agents/webview-ui/src/office/types'

/** Tiles of the counter: two desks side by side. */
const RECEPTION_COUNTER = { col: 6, row: 5 }
/** Where you appear the first time you open the office. */
export const RECEPTION_ENTRANCE_TILE = { col: 10, row: 12 }
/** World point between the receptionist's feet, behind the middle of the right-hand desk. */
export const RECEPTIONIST_FEET = {
  x: (RECEPTION_COUNTER.col + 4.5) * TILE_SIZE,
  y: RECEPTION_COUNTER.row * TILE_SIZE + 18
}
/** Tiles around the receptionist that you cannot walk into. */
export const RECEPTIONIST_BLOCKED = ['9,4', '10,4', '11,4', '9,5', '10,5', '11,5']

const MAT_TILES = new Set(['9,13', '10,13'])

export function createReceptionLayout(): OfficeLayout {
  const { col, row } = RECEPTION_COUNTER
  return createRoomLayout(
    {
      floorTile: TileType.FLOOR_4,
      floorColor: { h: 38, s: 16, b: 32, c: -30 },
      wallColor: { h: 30, s: 24, b: -28, c: -20 },
      matTiles: MAT_TILES,
      matTile: TileType.FLOOR_1,
      matColor: { h: 290, s: 18, b: -30, c: -20 }
    },
    [
      { type: 'HANGING_PLANT', col: 1, row: 0 },
      { type: 'LARGE_PAINTING', col: 2, row: 0 },
      { type: 'CLOCK', col: 12, row: 0 },
      { type: 'DOUBLE_BOOKSHELF', col: 17, row: 0 },
      { type: 'DESK_FRONT', col, row },
      { type: 'DESK_FRONT', col: col + 3, row },
      { type: 'PC_BACK', col: col + 1, row },
      { type: 'PLANT', col: 1, row: 7 },
      { type: 'SOFA_FRONT', col: 2, row: 8 },
      { type: 'SOFA_FRONT', col: 4, row: 8 },
      { type: 'PLANT_2', col: 6, row: 7 },
      { type: 'COFFEE_TABLE', col: 3, row: 9 },
      { type: 'LARGE_PLANT', col: 17, row: 2 },
      { type: 'CUSHIONED_BENCH', col: 15, row: 10 },
      { type: 'CUSHIONED_BENCH', col: 16, row: 10 },
      { type: 'CUSHIONED_BENCH', col: 17, row: 10 },
      { type: 'POT', col: 18, row: 12 }
    ],
    'reception'
  )
}
