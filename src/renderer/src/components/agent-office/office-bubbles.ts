import type { DashboardBucket } from '../../../../shared/dashboard-snapshot'
import {
  BUBBLE_PERMISSION_SPRITE,
  BUBBLE_WAITING_SPRITE
} from './vendor/pixel-agents/webview-ui/src/office/sprites/spriteData'
import type { SpriteData } from './vendor/pixel-agents/webview-ui/src/office/types'

const FILL = '#EEEEFF'
const NEEDS_YOU = '#D9483B'
const RESTING = '#8A93A3'

// Why: pixel-agents' waiting bubble is the frame; the glyph inside tells the state at a glance.
function withGlyph(color: string, pixels: [number, number][]): SpriteData {
  const outlineColor = BUBBLE_WAITING_SPRITE[0][1]
  const sprite = BUBBLE_WAITING_SPRITE.map((row) =>
    row.map((pixel) => (pixel === '' || pixel === outlineColor ? pixel : FILL))
  )
  for (const [col, row] of pixels) {
    sprite[row][col] = color
  }
  return sprite
}

const NEEDS_YOU_BUBBLE = withGlyph(NEEDS_YOU, [
  [5, 2],
  [5, 3],
  [5, 4],
  [5, 5],
  [5, 7]
])

const RESTING_BUBBLE = withGlyph(RESTING, [
  [3, 3],
  [4, 3],
  [5, 3],
  [6, 3],
  [5, 4],
  [4, 5],
  [3, 6],
  [4, 6],
  [5, 6],
  [6, 6]
])

/** Sprite shown over an agent's head, or none while it simply works. */
export function bubbleFor(bucket: DashboardBucket): SpriteData {
  switch (bucket) {
    case 'attention':
      return NEEDS_YOU_BUBBLE
    case 'working':
      return BUBBLE_PERMISSION_SPRITE
    case 'done':
      return BUBBLE_WAITING_SPRITE
    case 'idle':
      return RESTING_BUBBLE
  }
}
