import type { DashboardBucket } from '../../../../shared/dashboard-snapshot'
import { BUBBLE_FILL, BUBBLE_OUTLINE } from './office-bubbles'
import { BUBBLE_HEIGHT, BUBBLE_Z } from './office-desk-agents'
import { ROOM_COLS } from './office-room-grid'
import type { DepthDrawable, OfficeProjection } from './office-scene'
import type { OfficeThoughts } from './office-thoughts'
import type { WorldPoint } from './office-walker'
import { TILE_SIZE } from './vendor/pixel-agents/webview-ui/src/office/types'

const FONT_SIZE = 5
const LINE_HEIGHT = 6
const MAX_LINES = 2
/** Narrow enough that the clouds of agents at desks side by side, four tiles apart, do not touch. */
const MAX_TEXT_WIDTH = 54
const PADDING = 3
const MARGIN = 2
/** Space kept between two clouds, and how many times a cloud moves up out of another's way. */
const GAP = 2
const MAX_LIFTS = 3
const TRAIL_STEP = 4
const INK = '#2f3242'
const ROOM_WIDTH = ROOM_COLS * TILE_SIZE

/** Who keeps the cloud's natural place when two would meet: whoever needs you, then who works. */
const PRIORITY: Record<DashboardBucket, number> = { attention: 0, working: 1, done: 2, idle: 3 }

/** Someone on the floor with something on their mind. */
export type Thinker = { key: string; bucket: DashboardBucket; head: WorldPoint }

type Box = { left: number; top: number; width: number; height: number }
type Cloud = { lines: string[]; head: WorldPoint; box: Box }

function overlaps(a: Box, b: Box): boolean {
  return (
    a.left < b.left + b.width + GAP &&
    b.left < a.left + a.width + GAP &&
    a.top < b.top + b.height + GAP &&
    b.top < a.top + a.height + GAP
  )
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

// Why: everyone's thought shows at once; a cloud in another's way moves up, its trail still leading home.
function layout(
  context: CanvasRenderingContext2D,
  thinkers: readonly Thinker[],
  thoughts: OfficeThoughts,
  zoom: number
): Cloud[] {
  const placed: Cloud[] = []
  const ready = thinkers
    .filter(({ key }) => thoughts.has(key))
    .toSorted((a, b) => PRIORITY[a.bucket] - PRIORITY[b.bucket])
  for (const { key, head } of ready) {
    const lines = wrap(context, thoughts.get(key) ?? '', MAX_TEXT_WIDTH * zoom)
    const textWidth = Math.max(...lines.map((l) => context.measureText(l).width)) / zoom
    const width = Math.ceil(textWidth) + 2 * PADDING
    const height = lines.length * LINE_HEIGHT + 2 * PADDING - 1
    const left = Math.min(Math.max(MARGIN, head.x - 6), ROOM_WIDTH - width - MARGIN)
    const box = { left, top: head.y - BUBBLE_HEIGHT - 4 - height, width, height }
    for (let lift = 0; lift < MAX_LIFTS; lift++) {
      const blocking = placed.find((cloud) => overlaps(cloud.box, box))
      if (!blocking) {
        break
      }
      box.top = blocking.box.top - height - GAP
    }
    box.top = Math.max(MARGIN, box.top)
    placed.push({ lines, head, box })
  }
  return placed
}

/** Every thought on the floor in a cloud above its thinker's state bubble, dots trailing down to it. */
export function thoughtClouds(
  thinkers: readonly Thinker[],
  thoughts: OfficeThoughts,
  projection: OfficeProjection
): DepthDrawable | null {
  if (!thinkers.some(({ key }) => thoughts.has(key))) {
    return null
  }
  const { offsetX, offsetY, zoom } = projection
  return {
    zY: BUBBLE_Z + 2,
    draw: (context) => {
      context.font = `600 ${FONT_SIZE * zoom}px ui-monospace, "Cascadia Mono", Consolas, monospace`
      const clouds = layout(context, thinkers, thoughts, zoom)
      const px = (x: number, y: number, w: number, h: number): void =>
        context.fillRect(offsetX + x * zoom, offsetY + y * zoom, w * zoom, h * zoom)
      // Why: trails first, so one passing behind a lower cloud never crosses its text.
      for (const { head, box } of clouds) {
        const bottom = box.top + box.height
        const end = head.y - BUBBLE_HEIGHT - 1
        context.fillStyle = BUBBLE_OUTLINE
        px(head.x - 1, bottom, 3, 3)
        for (let y = bottom + TRAIL_STEP, i = 1; y + 2 <= end; y += TRAIL_STEP, i++) {
          px(head.x - (i % 2 === 1 ? 3 : 1), y, 2, 2)
        }
        context.fillStyle = BUBBLE_FILL
        px(head.x, bottom, 1, 2)
      }
      for (const { lines, box } of clouds) {
        const { left, top, width, height } = box
        context.fillStyle = BUBBLE_OUTLINE
        px(left + 1, top, width - 2, height)
        px(left, top + 1, width, height - 2)
        context.fillStyle = BUBBLE_FILL
        px(left + 1, top + 1, width - 2, height - 2)
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
}
