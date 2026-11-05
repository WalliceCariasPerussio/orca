import { BUBBLE_Z } from './office-desk-agents'
import { ROOM_COLS, ROOM_ROWS } from './office-room-grid'
import type { DepthDrawable, OfficeProjection } from './office-scene'
import type { WorldPoint } from './office-walker'
import { TILE_SIZE } from './vendor/pixel-agents/webview-ui/src/office/types'

export type Daylight = 'dawn' | 'day' | 'dusk' | 'night'

/** Wall tiles between the boards, sign and clock that every room leaves free for a window. */
const WINDOW_COLS = [4, 11]
/** The window's glass in world pixels from its tile's corner; the frame is drawn around it. */
const GLASS = { x: 3, y: 6, width: 10, height: 14 }
const FRAME = '#4A4F5A'
const SILL = '#A7ADB8'
const SKIES: Record<Daylight, { top: string; bottom: string }> = {
  dawn: { top: '#7FA6D9', bottom: '#F2B880' },
  day: { top: '#6FB7F0', bottom: '#BFE3FA' },
  dusk: { top: '#4B4E8A', bottom: '#E8875A' },
  night: { top: '#0E1430', bottom: '#1D2550' }
}
const STARS: readonly WorldPoint[] = [
  { x: 2, y: 2 },
  { x: 7, y: 4 },
  { x: 4, y: 9 },
  { x: 8, y: 11 }
]
const CLOUD = '#FFFFFF'
const NIGHT_TINT = 'rgba(8, 14, 44, 0.32)'
const LAMP = 'rgba(255, 220, 150, 0.30)'
const LAMP_RADIUS = 26

/** The sky outside at a local time. */
export function daylightAt(time: number): Daylight {
  const hour = new Date(time).getHours()
  if (hour >= 6 && hour < 8) {
    return 'dawn'
  }
  if (hour >= 8 && hour < 17) {
    return 'day'
  }
  return hour >= 17 && hour < 19 ? 'dusk' : 'night'
}

/** Windows on the wall, showing the sky of the hour. */
export function drawWindows(
  context: CanvasRenderingContext2D,
  projection: OfficeProjection,
  daylight: Daylight
): void {
  const { offsetX, offsetY, zoom } = projection
  const sky = SKIES[daylight]
  for (const col of WINDOW_COLS) {
    const left = col * TILE_SIZE + GLASS.x
    const px = (x: number, y: number, w: number, h: number): void =>
      context.fillRect(
        offsetX + (left + x) * zoom,
        offsetY + (GLASS.y + y) * zoom,
        w * zoom,
        h * zoom
      )
    context.fillStyle = FRAME
    px(-1, -1, GLASS.width + 2, GLASS.height + 2)
    const gradient = context.createLinearGradient(
      0,
      offsetY + GLASS.y * zoom,
      0,
      offsetY + (GLASS.y + GLASS.height) * zoom
    )
    gradient.addColorStop(0, sky.top)
    gradient.addColorStop(1, sky.bottom)
    context.fillStyle = gradient
    px(0, 0, GLASS.width, GLASS.height)
    context.fillStyle = daylight === 'night' ? '#E8E6C8' : CLOUD
    if (daylight === 'night') {
      STARS.forEach((star) => px(star.x, star.y, 1, 1))
    } else if (daylight === 'day') {
      px(2, 3, 4, 1)
      px(3, 2, 2, 1)
    }
    context.fillStyle = FRAME
    px(GLASS.width / 2 - 0.5, 0, 1, GLASS.height)
    px(0, GLASS.height / 2, GLASS.width, 1)
    context.fillStyle = SILL
    px(-2, GLASS.height + 1, GLASS.width + 4, 1)
  }
}

/** At night the room dims a little; drawn under the bubbles so they stay bright. */
export function nightTint(projection: OfficeProjection): DepthDrawable {
  const { offsetX, offsetY, zoom } = projection
  return {
    zY: BUBBLE_Z - 2,
    draw: (context) => {
      context.fillStyle = NIGHT_TINT
      context.fillRect(offsetX, offsetY, ROOM_COLS * TILE_SIZE * zoom, ROOM_ROWS * TILE_SIZE * zoom)
    }
  }
}

/** A lamp's pool of warm light over a desk where someone works late. */
export function deskLamp(center: WorldPoint, projection: OfficeProjection): DepthDrawable {
  const { offsetX, offsetY, zoom } = projection
  const x = offsetX + center.x * zoom
  const y = offsetY + center.y * zoom
  const radius = LAMP_RADIUS * zoom
  return {
    zY: BUBBLE_Z - 1,
    draw: (context) => {
      const glow = context.createRadialGradient(x, y, 0, x, y, radius)
      glow.addColorStop(0, LAMP)
      glow.addColorStop(1, 'rgba(255, 220, 150, 0)')
      context.fillStyle = glow
      context.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    }
  }
}
