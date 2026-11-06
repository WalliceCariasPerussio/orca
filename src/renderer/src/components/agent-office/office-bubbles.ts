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
const WATCHING = '#2F6FDB'
const ASLEEP = '#5B63B7'

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

const NAPPING_BUBBLE = withGlyph(RESTING, [
  [5, 2],
  [6, 2],
  [7, 2],
  [8, 2],
  [7, 3],
  [6, 4],
  [5, 5],
  [6, 5],
  [7, 5],
  [8, 5],
  [2, 5],
  [3, 5],
  [4, 5],
  [3, 6],
  [2, 7],
  [3, 7],
  [4, 7]
])

// Why: Orca marks a slept workspace with a moon; a crescent tells it apart from a doze's Zz.
const ASLEEP_BUBBLE = withGlyph(ASLEEP, [
  [4, 2],
  [5, 2],
  [6, 2],
  [3, 3],
  [4, 3],
  [5, 3],
  [3, 4],
  [4, 4],
  [3, 5],
  [4, 5],
  [3, 6],
  [4, 6],
  [5, 6],
  [4, 7],
  [5, 7],
  [6, 7],
  [7, 3]
])

// Why: an open eye reads as "watching" next to the typing dots of real work.
const MONITORING_BUBBLE = withGlyph(WATCHING, [
  [4, 3],
  [5, 3],
  [6, 3],
  [3, 4],
  [5, 4],
  [7, 4],
  [2, 5],
  [5, 5],
  [8, 5],
  [3, 6],
  [7, 6],
  [4, 7],
  [5, 7],
  [6, 7]
])

/** Asleep with its workspace, dozing off when idle, or only watching background tasks while working. */
export type BubblePose = 'asleep' | 'napping' | 'monitoring' | null

/** Sprite shown over an agent's head; a turn that failed or was stopped shows that instead of ✓. */
export function bubbleFor(
  bucket: DashboardBucket,
  verdict?: OfficeVerdict,
  pose: BubblePose = null
): SpriteData {
  if (pose === 'asleep') {
    return ASLEEP_BUBBLE
  }
  if (pose === 'napping') {
    return NAPPING_BUBBLE
  }
  if (pose === 'monitoring' && bucket === 'working') {
    return MONITORING_BUBBLE
  }
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
