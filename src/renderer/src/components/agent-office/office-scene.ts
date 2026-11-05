import { renderTileGrid } from './vendor/pixel-agents/webview-ui/src/office/engine/renderer'
import {
  getBlockedTiles,
  layoutToFurnitureInstances,
  layoutToTileMap
} from './vendor/pixel-agents/webview-ui/src/office/layout/layoutSerializer'
import { mapOffset } from './vendor/pixel-agents/webview-ui/src/office/projection'
import { getCachedSprite } from './vendor/pixel-agents/webview-ui/src/office/sprites/spriteCache'
import {
  TILE_SIZE,
  type FurnitureInstance,
  type OfficeLayout,
  type TileType
} from './vendor/pixel-agents/webview-ui/src/office/types'
import { getWallInstances } from './vendor/pixel-agents/webview-ui/src/office/wallTiles'

export type OfficeScene = {
  layout: OfficeLayout
  tileMap: TileType[][]
  furniture: FurnitureInstance[]
  blockedTiles: Set<string>
}

/** Device-pixel placement of the map inside the canvas. */
export type OfficeProjection = {
  offsetX: number
  offsetY: number
  zoom: number
  devicePixelRatio: number
}

/** Anything drawn in depth order with walls and furniture; larger zY is nearer. */
export type DepthDrawable = {
  zY: number
  draw: (context: CanvasRenderingContext2D) => void
}

export type WallSign = {
  col: number
  widthTiles: number
  text: string
}

const SIGN_TOP = 7
const SIGN_HEIGHT = 13
const SIGN_FONT_SIZE = 7
const SIGN_FILL = '#2f3242'
const SIGN_BORDER = '#737c8d'
const SIGN_TEXT = '#f3ecd9'

export function buildOfficeScene(layout: OfficeLayout, extraBlocked: string[] = []): OfficeScene {
  const blockedTiles = getBlockedTiles(layout.furniture)
  for (const key of extraBlocked) {
    blockedTiles.add(key)
  }
  return {
    layout,
    tileMap: layoutToTileMap(layout),
    furniture: layoutToFurnitureInstances(layout.furniture),
    blockedTiles
  }
}

// Why: integer zoom keeps every sprite pixel the same size on screen.
export function fitZoom(widthPx: number, heightPx: number, layout: OfficeLayout): number {
  const byWidth = widthPx / (layout.cols * TILE_SIZE)
  const byHeight = heightPx / (layout.rows * TILE_SIZE)
  return Math.max(1, Math.floor(Math.min(byWidth, byHeight)))
}

export function projectScene(
  scene: OfficeScene,
  widthPx: number,
  heightPx: number,
  devicePixelRatio: number
): OfficeProjection {
  const zoom = fitZoom(widthPx, heightPx, scene.layout)
  const { offsetX, offsetY } = mapOffset(
    widthPx,
    heightPx,
    scene.layout.cols,
    scene.layout.rows,
    zoom,
    0,
    0
  )
  return { offsetX, offsetY, zoom, devicePixelRatio }
}

function furnitureDrawable(item: FurnitureInstance, projection: OfficeProjection): DepthDrawable {
  const { offsetX, offsetY, zoom } = projection
  const cached = getCachedSprite(item.sprite, zoom)
  const x = offsetX + item.x * zoom
  const y = offsetY + item.y * zoom
  return {
    zY: item.zY,
    draw: (context) => {
      if (!item.mirrored) {
        context.drawImage(cached, x, y)
        return
      }
      context.save()
      context.translate(x + cached.width, y)
      context.scale(-1, 1)
      context.drawImage(cached, 0, 0)
      context.restore()
    }
  }
}

export function drawOfficeScene(
  context: CanvasRenderingContext2D,
  scene: OfficeScene,
  projection: OfficeProjection,
  widthPx: number,
  heightPx: number,
  extras: DepthDrawable[]
): void {
  const { layout, tileMap } = scene
  const { offsetX, offsetY, zoom } = projection
  context.clearRect(0, 0, widthPx, heightPx)
  context.imageSmoothingEnabled = false
  renderTileGrid(context, tileMap, offsetX, offsetY, zoom, layout.tileColors, layout.cols)
  const walls = getWallInstances(tileMap, layout.tileColors, layout.cols)
  const drawables = [...walls, ...scene.furniture].map((item) =>
    furnitureDrawable(item, projection)
  )
  drawables.push(...extras)
  drawables.sort((a, b) => a.zY - b.zY)
  for (const drawable of drawables) {
    drawable.draw(context)
  }
}

export function drawWallSign(
  context: CanvasRenderingContext2D,
  projection: OfficeProjection,
  sign: WallSign
): void {
  const { offsetX, offsetY, zoom } = projection
  const x = offsetX + (sign.col * TILE_SIZE + 2) * zoom
  const y = offsetY + SIGN_TOP * zoom
  const width = (sign.widthTiles * TILE_SIZE - 4) * zoom
  const height = SIGN_HEIGHT * zoom
  context.fillStyle = SIGN_BORDER
  context.fillRect(x, y, width, height)
  context.fillStyle = SIGN_FILL
  context.fillRect(x + zoom, y + zoom, width - 2 * zoom, height - 2 * zoom)
  context.fillStyle = SIGN_TEXT
  context.font = `700 ${SIGN_FONT_SIZE * zoom}px ui-monospace, "Cascadia Mono", Consolas, monospace`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.letterSpacing = `${zoom}px`
  context.fillText(sign.text, x + width / 2, y + height / 2 + zoom / 2, width - 4 * zoom)
  context.letterSpacing = '0px'
}

/** World pixel under a point given in CSS pixels relative to the canvas. */
export function worldAtCss(
  projection: OfficeProjection,
  cssX: number,
  cssY: number
): { x: number; y: number } {
  const { offsetX, offsetY, zoom, devicePixelRatio } = projection
  return {
    x: (cssX * devicePixelRatio - offsetX) / zoom,
    y: (cssY * devicePixelRatio - offsetY) / zoom
  }
}

/** CSS pixels, relative to the canvas, of a world point. */
export function cssAtWorld(
  projection: OfficeProjection,
  worldX: number,
  worldY: number
): { left: number; top: number } {
  const { offsetX, offsetY, zoom, devicePixelRatio } = projection
  return {
    left: (offsetX + worldX * zoom) / devicePixelRatio,
    top: (offsetY + worldY * zoom) / devicePixelRatio
  }
}

/** World tile under a point given in CSS pixels relative to the canvas. */
export function tileAtCss(
  projection: OfficeProjection,
  cssX: number,
  cssY: number
): { col: number; row: number } {
  const world = worldAtCss(projection, cssX, cssY)
  return { col: Math.floor(world.x / TILE_SIZE), row: Math.floor(world.y / TILE_SIZE) }
}
