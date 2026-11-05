import { useEffect, useRef } from 'react'
import type { PetSprite } from './office-pet-sprite'

/** A pet's first standing frame, cropped to the figure and fitted in a square; blank while loading. */
export default function PetThumbnail({
  sprite,
  size
}: {
  sprite: PetSprite | null
  size: number
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const frame = sprite?.idle[0]
    const context = canvas?.getContext('2d')
    if (!canvas || !context) {
      return
    }
    const side = Math.round(size * (window.devicePixelRatio || 1))
    canvas.width = side
    canvas.height = side
    if (!sprite || !frame) {
      return
    }
    const { figure } = sprite
    const scale = Math.min(side / figure.width, side / figure.height)
    const width = figure.width * scale
    const height = figure.height * scale
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(
      frame.image,
      frame.sx + figure.x,
      frame.sy + figure.y,
      figure.width,
      figure.height,
      (side - width) / 2,
      (side - height) / 2,
      width,
      height
    )
  }, [sprite, size])
  return <canvas ref={canvasRef} aria-hidden style={{ width: size, height: size }} />
}
