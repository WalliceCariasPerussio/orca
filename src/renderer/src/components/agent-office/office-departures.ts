import { figureDrawable } from './office-figures'
import { frameAt } from './office-pet-sprite'
import type { Leaver } from './office-roaming'
import { ELEVATOR_FRONT_TILE } from './office-room-grid'
import type { DepthDrawable, OfficeProjection, OfficeScene } from './office-scene'
import { isWalking, stepWalker } from './office-walker'
import { findPath } from './vendor/pixel-agents/webview-ui/src/office/layout/tileMap'

/** Agents whose work ended walk out to the elevator and are gone once they reach it. */
export class Departures {
  private leavers: Leaver[] = []

  add(leavers: readonly Leaver[], scene: OfficeScene): void {
    for (const leaver of leavers) {
      const { walker } = leaver
      const blocked = new Set(scene.blockedTiles)
      blocked.delete(`${walker.col},${walker.row}`)
      const to = ELEVATOR_FRONT_TILE
      const path = findPath(walker.col, walker.row, to.col, to.row, scene.tileMap, blocked)
      if (path.length > 0) {
        walker.path = path
        walker.glide = null
        this.leavers.push(leaver)
      }
    }
  }

  clear(): void {
    this.leavers = []
  }

  /** Walks them on; true while anyone is still on the way out. */
  tick(dt: number): boolean {
    for (const { walker } of this.leavers) {
      stepWalker(walker, dt)
    }
    this.leavers = this.leavers.filter(({ walker }) => isWalking(walker))
    return this.leavers.length > 0
  }

  drawables(now: number, projection: OfficeProjection): DepthDrawable[] {
    return this.leavers.map(({ desk, walker }) => {
      const { sprite } = desk
      const strip = walker.facing === 'left' ? sprite.walkLeft : sprite.walkRight
      const feet = { x: walker.x, y: walker.y }
      return figureDrawable({
        sprite,
        frame: frameAt(strip, now).frame,
        feet,
        zY: feet.y,
        projection
      })
    })
  }
}
