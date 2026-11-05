import type { DashboardBucket } from '../../../../shared/dashboard-snapshot'
import { BUBBLE_FILL, BUBBLE_OUTLINE } from './office-bubbles'
import { BUBBLE_HEIGHT, BUBBLE_Z } from './office-desk-agents'
import { ROOM_COLS } from './office-room-grid'
import type { DepthDrawable, OfficeProjection } from './office-scene'
import type { OfficeThoughts } from './office-thoughts'
import type { WorldPoint } from './office-walker'
import { TILE_SIZE } from './vendor/pixel-agents/webview-ui/src/office/types'

/** Each turn one agent thinks out loud for a while, then the cloud clears before the next one. */
const TURN_MS = 6000
const SHOWN_MS = 4800
const FONT_SIZE = 5
const LINE_HEIGHT = 6
const MAX_LINES = 2
const MAX_TEXT_WIDTH = 78
const PADDING = 3
const MARGIN = 2
const INK = '#2f3242'
const ROOM_WIDTH = ROOM_COLS * TILE_SIZE

const TURN_ORDER: Record<DashboardBucket, number> = { attention: 0, working: 1, done: 2, idle: 3 }

/** Someone on the floor with something on their mind. */
export type Thinker = { key: string; bucket: DashboardBucket; head: WorldPoint }

/** The thinker whose turn it is, or null between turns; and how long until that changes. */
export function thinkerNow(
  thinkers: readonly Thinker[],
  thoughts: OfficeThoughts,
  now: number
): { thinker: Thinker | null; holdMs: number } {
  const ready = thinkers
    .filter(({ key }) => thoughts.has(key))
    .toSorted((a, b) => TURN_ORDER[a.bucket] - TURN_ORDER[b.bucket])
  if (ready.length === 0) {
    return { thinker: null, holdMs: Number.POSITIVE_INFINITY }
  }
  const into = now % TURN_MS
  const shown = into < SHOWN_MS
  return {
    thinker: shown ? ready[Math.floor(now / TURN_MS) % ready.length] : null,
    holdMs: shown ? SHOWN_MS - into : TURN_MS - into
  }
}

function wrap(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (context.measureText(next).width <= maxWidth || !line) {
      line = next
    } else {
      lines.push(line)
      line = word
    }
  }
  lines.push(line)
  if (lines.length <= MAX_LINES) {
    return lines.map((l) => clip(context, l, maxWidth))
  }
  return [...lines.slice(0, MAX_LINES - 1), clip(context, `${lines[MAX_LINES - 1]}…`, maxWidth)]
}

function clip(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (context.measureText(text).width <= maxWidth) {
    return text
  }
  let end = text.length - 1
  while (end > 1 && context.measureText(`${text.slice(0, end)}…`).width > maxWidth) {
    end--
  }
  return `${text.slice(0, end)}…`
}

/** A thought cloud above the state bubble, its trail of dots leading down to the thinker's head. */
export function thoughtCloud(
  text: string,
  head: WorldPoint,
  projection: OfficeProjection
): DepthDrawable {
  const { offsetX, offsetY, zoom } = projection
  return {
    zY: BUBBLE_Z + 2,
    draw: (context) => {
      context.font = `600 ${FONT_SIZE * zoom}px ui-monospace, "Cascadia Mono", Consolas, monospace`
      const lines = wrap(context, text, MAX_TEXT_WIDTH * zoom)
      const textWidth = Math.max(...lines.map((l) => context.measureText(l).width)) / zoom
      const width = Math.ceil(textWidth) + 2 * PADDING
      const height = lines.length * LINE_HEIGHT + 2 * PADDING - 1
      const bottom = head.y - BUBBLE_HEIGHT - 4
      const left = Math.min(Math.max(MARGIN, head.x - 6), ROOM_WIDTH - width - MARGIN)
      const top = Math.max(MARGIN, bottom - height)
      const px = (x: number, y: number, w: number, h: number): void =>
        context.fillRect(offsetX + x * zoom, offsetY + y * zoom, w * zoom, h * zoom)
      context.fillStyle = BUBBLE_OUTLINE
      px(left + 1, top, width - 2, height)
      px(left, top + 1, width, height - 2)
      px(head.x - 1, top + height, 3, 3)
      px(head.x - 3, top + height + 4, 2, 2)
      context.fillStyle = BUBBLE_FILL
      px(left + 1, top + 1, width - 2, height - 2)
      px(head.x, top + height, 1, 2)
      context.fillStyle = INK
      context.textAlign = 'left'
      context.textBaseline = 'top'
      lines.forEach((line, i) => {
        const x = offsetX + (left + PADDING) * zoom
        const y = offsetY + (top + PADDING + i * LINE_HEIGHT) * zoom
        context.fillText(line, x, y)
      })
    }
  }
}
