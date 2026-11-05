import type { DashboardBucket } from '../../../../shared/dashboard-snapshot'
import type { OfficeAgent } from './office-agents'
import { BUBBLE_Z } from './office-desk-agents'
import { FIGURE_HEIGHT } from './office-figures'
import type { DepthDrawable, OfficeProjection } from './office-scene'
import { toss } from './office-team-draw'
import type { WorldPoint } from './office-walker'

const CHEER_MS = 1800
const FADE_MS = 400
const HOP_MS = 300
const HOPS = 3
const HOP_HEIGHT = 3
const PIECES = 18
const GRAVITY = 150
const TWINKLE_MS = 120
/** Confetti lands on the floor a little in front of the agent's feet. */
const LANDING = 6
const CONFETTI = ['#f4d35e', '#ee6c4d', '#7bdff2', '#c77dff', '#80ed99', '#ff99c8']

/** Agents that just finished hop at their desk under a burst of confetti. */
export class Cheers {
  private buckets = new Map<string, DashboardBucket>()
  private readonly started = new Map<string, number>()

  /** Notes every agent's state; one that went from working, or from waiting on you, to done cheers. */
  notice(agents: readonly OfficeAgent[], now: number): void {
    const next = new Map<string, DashboardBucket>()
    for (const agent of agents) {
      const before = this.buckets.get(agent.key)
      if (agent.bucket === 'done' && (before === 'working' || before === 'attention')) {
        this.started.set(agent.key, now)
      }
      next.set(agent.key, agent.bucket)
    }
    this.buckets = next
    this.prune(now)
  }

  /** True while a cheer plays, so the frame loop keeps running for it. */
  active(now: number): boolean {
    this.prune(now)
    return this.started.size > 0
  }

  /** World pixels the agent is off the ground this frame. */
  lift(key: string, now: number): number {
    const elapsed = this.elapsed(key, now)
    if (elapsed === null || elapsed >= HOP_MS * HOPS) {
      return 0
    }
    return Math.round(Math.abs(Math.sin((elapsed / HOP_MS) * Math.PI)) * HOP_HEIGHT)
  }

  confetti(
    key: string,
    feet: WorldPoint,
    now: number,
    projection: OfficeProjection
  ): DepthDrawable | null {
    const elapsed = this.elapsed(key, now)
    if (elapsed === null) {
      return null
    }
    const t = elapsed / 1000
    const { offsetX, offsetY, zoom } = projection
    const twinkle = Math.floor(elapsed / TWINKLE_MS) % 2
    return {
      zY: BUBBLE_Z - 1,
      draw: (context) => {
        context.save()
        context.globalAlpha = Math.min(1, (CHEER_MS - elapsed) / FADE_MS)
        for (let i = 0; i < PIECES; i++) {
          const seed = `${key}:${i}`
          const vx = toss(seed, 81) - 40
          const vy = -(55 + toss(`${seed}:up`, 45))
          const x = feet.x + vx * t
          const y = Math.min(
            feet.y + LANDING,
            feet.y - FIGURE_HEIGHT + vy * t + (GRAVITY * t * t) / 2
          )
          const flat = (i + twinkle) % 2 === 0
          context.fillStyle = CONFETTI[i % CONFETTI.length]
          context.fillRect(
            Math.round(offsetX + x * zoom),
            Math.round(offsetY + y * zoom),
            (flat ? 2 : 1) * zoom,
            (flat ? 1 : 2) * zoom
          )
        }
        context.restore()
      }
    }
  }

  private elapsed(key: string, now: number): number | null {
    const at = this.started.get(key)
    if (at === undefined) {
      return null
    }
    const elapsed = Math.max(0, now - at)
    return elapsed < CHEER_MS ? elapsed : null
  }

  private prune(now: number): void {
    for (const [key, at] of this.started) {
      if (now - at >= CHEER_MS || !this.buckets.has(key)) {
        this.started.delete(key)
      }
    }
  }
}
