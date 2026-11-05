import { TILE_SIZE } from './vendor/pixel-agents/webview-ui/src/office/types'

export type TilePoint = { col: number; row: number }
export type WorldPoint = { x: number; y: number }
export type Facing = 'left' | 'right'

/** Someone moving through the office; x/y are world pixels between their feet. */
export type Walker = {
  x: number
  y: number
  col: number
  row: number
  facing: Facing
  /** Tiles still to cross, nearest first. */
  path: TilePoint[]
  /** Free-form target used off the grid, e.g. stepping into the elevator car. */
  glide: WorldPoint | null
}

const FEET_OFFSET_Y = 13
export const WALK_SPEED = 72

export function tileFeet(tile: TilePoint): WorldPoint {
  return { x: tile.col * TILE_SIZE + TILE_SIZE / 2, y: tile.row * TILE_SIZE + FEET_OFFSET_Y }
}

export function createWalker(tile: TilePoint, facing: Facing = 'right'): Walker {
  const feet = tileFeet(tile)
  return { ...feet, ...tile, facing, path: [], glide: null }
}

export function isWalking(walker: Walker): boolean {
  return walker.path.length > 0 || walker.glide !== null
}

function moveToward(walker: Walker, target: WorldPoint, budget: number): number {
  const dx = target.x - walker.x
  const dy = target.y - walker.y
  const distance = Math.hypot(dx, dy)
  if (dx !== 0) {
    walker.facing = dx < 0 ? 'left' : 'right'
  }
  if (distance <= budget) {
    walker.x = target.x
    walker.y = target.y
    return budget - distance
  }
  walker.x += (dx / distance) * budget
  walker.y += (dy / distance) * budget
  return 0
}

/** Advance along the path; returns true while there is still somewhere to go. */
export function stepWalker(walker: Walker, dtSeconds: number): boolean {
  let budget = WALK_SPEED * dtSeconds
  while (budget > 0 && (walker.glide || walker.path.length > 0)) {
    if (walker.glide) {
      budget = moveToward(walker, walker.glide, budget)
      if (walker.x === walker.glide.x && walker.y === walker.glide.y) {
        walker.glide = null
      }
      continue
    }
    const next = walker.path[0]
    budget = moveToward(walker, tileFeet(next), budget)
    const feet = tileFeet(next)
    if (walker.x === feet.x && walker.y === feet.y) {
      walker.col = next.col
      walker.row = next.row
      walker.path.shift()
    }
  }
  return isWalking(walker)
}
