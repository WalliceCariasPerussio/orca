import { rgbaToHex } from './vendor/pixel-agents/core/src/assets/colorUtils'
import {
  CHAR_FRAME_H,
  CHAR_FRAME_W,
  CHAR_FRAMES_PER_ROW,
  CHARACTER_DIRECTIONS,
  WALL_BITMASK_COUNT,
  WALL_GRID_COLS,
  WALL_PIECE_HEIGHT,
  WALL_PIECE_WIDTH
} from './vendor/pixel-agents/core/src/assets/constants'
import type { CharacterDirectionSprites } from './vendor/pixel-agents/core/src/assets/types'
import type { SpriteData } from './vendor/pixel-agents/webview-ui/src/office/types'

// Why: pixel-agents decodes PNGs with pngjs in Node; the renderer reads the same pixels from a canvas.
export async function loadImagePixels(url: string): Promise<ImageData> {
  const image = new Image()
  image.src = url
  await image.decode()
  const canvas = new OffscreenCanvas(image.naturalWidth, image.naturalHeight)
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('Canvas 2D is unavailable')
  }
  context.drawImage(image, 0, 0)
  return context.getImageData(0, 0, image.naturalWidth, image.naturalHeight)
}

export function spriteFromPixels(
  pixels: ImageData,
  originX: number,
  originY: number,
  width: number,
  height: number
): SpriteData {
  const sprite: SpriteData = []
  for (let y = 0; y < height; y++) {
    const row: string[] = []
    for (let x = 0; x < width; x++) {
      const px = originX + x
      const py = originY + y
      if (px >= pixels.width || py >= pixels.height) {
        row.push('')
        continue
      }
      const i = (py * pixels.width + px) * 4
      const d = pixels.data
      row.push(rgbaToHex(d[i], d[i + 1], d[i + 2], d[i + 3]))
    }
    sprite.push(row)
  }
  return sprite
}

export function wallPiecesFromPixels(pixels: ImageData): SpriteData[] {
  return Array.from({ length: WALL_BITMASK_COUNT }, (_, mask) =>
    spriteFromPixels(
      pixels,
      (mask % WALL_GRID_COLS) * WALL_PIECE_WIDTH,
      Math.floor(mask / WALL_GRID_COLS) * WALL_PIECE_HEIGHT,
      WALL_PIECE_WIDTH,
      WALL_PIECE_HEIGHT
    )
  )
}

export function characterFramesFromPixels(pixels: ImageData): CharacterDirectionSprites {
  const frames: CharacterDirectionSprites = { down: [], up: [], right: [] }
  CHARACTER_DIRECTIONS.forEach((direction, row) => {
    frames[direction] = Array.from({ length: CHAR_FRAMES_PER_ROW }, (_, frame) =>
      spriteFromPixels(pixels, frame * CHAR_FRAME_W, row * CHAR_FRAME_H, CHAR_FRAME_W, CHAR_FRAME_H)
    )
  })
  return frames
}
