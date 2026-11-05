export type FrameResult = {
  /** True while something moves and the next frame should follow right away. */
  animating: boolean
  /** When still, how long the picture stays correct; Infinity means until invalidated. */
  holdMs: number
}

// Why: a still office costs nothing; frames run only while something moves or a pet's frame changes.
export class FrameLoop {
  private frameId = 0
  private timeoutId = 0
  private lastTime = 0
  private disposed = false

  constructor(private readonly tick: (dtSeconds: number, now: number) => FrameResult) {
    document.addEventListener('visibilitychange', this.onVisibilityChange)
  }

  invalidate(): void {
    if (this.disposed || this.frameId !== 0 || document.hidden) {
      return
    }
    window.clearTimeout(this.timeoutId)
    this.frameId = requestAnimationFrame(this.onFrame)
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.frameId)
    window.clearTimeout(this.timeoutId)
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
  }

  private readonly onFrame = (now: number): void => {
    this.frameId = 0
    const dt = this.lastTime === 0 ? 0 : Math.min(0.1, (now - this.lastTime) / 1000)
    this.lastTime = now
    const { animating, holdMs } = this.tick(dt, now)
    if (animating) {
      this.invalidate()
      return
    }
    this.lastTime = 0
    if (Number.isFinite(holdMs)) {
      this.timeoutId = window.setTimeout(() => this.invalidate(), Math.max(16, holdMs))
    }
  }

  private readonly onVisibilityChange = (): void => {
    if (!document.hidden) {
      this.invalidate()
    }
  }
}
