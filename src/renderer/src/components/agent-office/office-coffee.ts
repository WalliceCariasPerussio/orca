import type { DepthDrawable, OfficeProjection } from './office-scene'
import type { WorldPoint } from './office-walker'
import { getCatalogEntry } from './vendor/pixel-agents/webview-ui/src/office/layout/furnitureCatalog'
import { getCachedSprite } from './vendor/pixel-agents/webview-ui/src/office/sprites/spriteCache'

/** From an agent's feet to the top-left of the mug it carries, at hand height on its right. */
const HAND = { x: 4, y: -11 }

type MugBounds = { x: number; y: number; width: number; height: number }
let bounds: MugBounds | null = null

// Why: the coffee sprite is a whole tile with the mug in one corner; carry just the mug.
function mugBounds(sprite: string[][]): MugBounds {
  if (bounds) {
    return bounds
  }
  let left = Infinity
  let top = Infinity
  let right = -1
  let bottom = -1
  sprite.forEach((row, y) =>
    row.forEach((pixel, x) => {
      if (pixel) {
        left = Math.min(left, x)
        top = Math.min(top, y)
        right = Math.max(right, x)
        bottom = Math.max(bottom, y)
      }
    })
  )
  bounds = { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }
  return bounds
}

/** The mug in a resting agent's hand, after a trip to the coffee counter. */
export function mugDrawable(feet: WorldPoint, projection: OfficeProjection): DepthDrawable | null {
  const sprite = getCatalogEntry('COFFEE')?.sprite
  if (!sprite) {
    return null
  }
  const { offsetX, offsetY, zoom } = projection
  const mug = mugBounds(sprite)
  const cached = getCachedSprite(sprite, zoom)
  const x = offsetX + (feet.x + HAND.x) * zoom
  const y = offsetY + (feet.y + HAND.y) * zoom
  return {
    zY: feet.y + 0.1,
    draw: (context) =>
      context.drawImage(
        cached,
        mug.x * zoom,
        mug.y * zoom,
        mug.width * zoom,
        mug.height * zoom,
        x,
        y,
        mug.width * zoom,
        mug.height * zoom
      )
  }
}
