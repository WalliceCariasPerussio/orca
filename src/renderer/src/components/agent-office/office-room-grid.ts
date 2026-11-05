import {
  TileType,
  type ColorValue,
  type OfficeLayout,
  type PlacedFurniture
} from './vendor/pixel-agents/webview-ui/src/office/types'

export const ROOM_COLS = 20
export const ROOM_ROWS = 14
const WALL_ROW = 1

/** Every floor puts the elevator on the same wall tiles, so riding it never moves the door. */
export const ELEVATOR_TILE = { col: 14, row: 0 }
/** Tile in front of the elevator where you wait for the doors. */
export const ELEVATOR_FRONT_TILE = { col: 14, row: 2 }
/** Wall tiles the room sign covers. */
export const ROOM_SIGN = { col: 5, widthTiles: 6 }

export type RoomFinish = {
  floorTile: TileType
  floorColor: ColorValue
  wallColor: ColorValue
  /** Floor tiles painted with the mat finish, as "col,row". */
  matTiles?: ReadonlySet<string>
  matTile?: TileType
  matColor?: ColorValue
}

function tileAt(col: number, row: number, finish: RoomFinish): TileType {
  if (row < WALL_ROW) {
    return TileType.VOID
  }
  if (row === WALL_ROW || col === 0 || col === ROOM_COLS - 1) {
    return TileType.WALL
  }
  if (finish.matTile !== undefined && finish.matTiles?.has(`${col},${row}`)) {
    return finish.matTile
  }
  return finish.floorTile
}

function colorAt(tile: TileType, finish: RoomFinish): ColorValue | null {
  if (tile === TileType.VOID) {
    return null
  }
  if (tile === TileType.WALL) {
    return finish.wallColor
  }
  if (tile === finish.matTile && finish.matColor) {
    return finish.matColor
  }
  return finish.floorColor
}

export function createRoomLayout(
  finish: RoomFinish,
  furniture: Omit<PlacedFurniture, 'uid'>[],
  uidPrefix: string
): OfficeLayout {
  const tiles: TileType[] = []
  for (let row = 0; row < ROOM_ROWS; row++) {
    for (let col = 0; col < ROOM_COLS; col++) {
      tiles.push(tileAt(col, row, finish))
    }
  }
  return {
    version: 1,
    cols: ROOM_COLS,
    rows: ROOM_ROWS,
    tiles,
    tileColors: tiles.map((tile) => colorAt(tile, finish)),
    furniture: furniture.map((item, i) => ({ ...item, uid: `${uidPrefix}-${i}` }))
  }
}
