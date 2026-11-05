import type { PetFrame, PetSprite } from './office-pet-sprite'
import type { DepthDrawable, OfficeProjection } from './office-scene'
import type { WorldPoint } from './office-walker'

/** World pixels a person is tall, matching pixel-agents' characters. */
export const FIGURE_HEIGHT = 24

type FigureOptions = {
  sprite: PetSprite
  frame: PetFrame
  feet: WorldPoint
  zY: number
  projection: OfficeProjection
  clip?: (context: CanvasRenderingContext2D) => void
}

/** A pet drawn with its feet on `feet`, sorted with the room at `zY`. */
export function figureDrawable({
  sprite,
  frame,
  feet,
  zY,
  projection,
  clip
}: FigureOptions): DepthDrawable {
  const { figure } = sprite
  const { offsetX, offsetY, zoom } = projection
  const scale = FIGURE_HEIGHT / figure.height
  const x = offsetX + (feet.x - (figure.x + figure.width / 2) * scale) * zoom
  const y = offsetY + (feet.y - (figure.y + figure.height) * scale) * zoom
  return {
    zY,
    draw: (context) => {
      context.save()
      clip?.(context)
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.drawImage(
        frame.image,
        frame.sx,
        frame.sy,
        frame.sw,
        frame.sh,
        Math.round(x),
        Math.round(y),
        Math.round(frame.sw * scale * zoom),
        Math.round(frame.sh * scale * zoom)
      )
      context.restore()
    }
  }
}
