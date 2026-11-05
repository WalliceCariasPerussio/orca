import type { DashboardBucket } from '../../../../shared/dashboard-snapshot'
import type { OfficeVerdict } from './office-agents'
import {
  BUBBLE_PERMISSION_SPRITE,
  BUBBLE_WAITING_SPRITE
} from './vendor/pixel-agents/webview-ui/src/office/sprites/spriteData'
import type { SpriteData } from './vendor/pixel-agents/webview-ui/src/office/types'

export const BUBBLE_FILL = '#EEEEFF'
export const BUBBLE_OUTLINE = BUBBLE_WAITING_SPRITE[0][1]
const NEEDS_YOU = '#D9483B'
const RESTING = '#8A93A3'
const FAILED = '#C2410C'

// Why: pixel-agents' waiting bubble is the frame; the glyph inside tells the state at a glance.
function withGlyph(color: string, pixels: [number, number][]): SpriteData {
  const sprite = BUBBLE_WAITING_SPRITE.map((row) =>
    row.map((pixel) => (pixel === '' || pixel === BUBBLE_OUTLINE ? pixel : BUBBLE_FILL))
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

const FAILED_BUBBLE = withGlyph(FAILED, [
  [3, 2],
  [7, 2],
  [4, 3],
  [6, 3],
  [5, 4],
  [4, 5],
  [6, 5],
  [3, 6],
  [7, 6]
])

const STOPPED_BUBBLE = withGlyph(RESTING, [
  [4, 3],
  [5, 3],
  [6, 3],
  [4, 4],
  [5, 4],
  [6, 4],
  [4, 5],
  [5, 5],
  [6, 5]
])

/** Sprite shown over an agent's head; a turn that failed or was stopped shows that instead of ✓. */
export function bubbleFor(bucket: DashboardBucket, verdict?: OfficeVerdict): SpriteData {
  if (verdict === 'failed') {
    return FAILED_BUBBLE
  }
  if (verdict === 'interrupted') {
    return STOPPED_BUBBLE
  }
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
