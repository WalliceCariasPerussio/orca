import { frameAt, type PetFrame, type PetSprite } from './office-pet-sprite'
import { isWalking, type Walker } from './office-walker'

type Animation = 'idle' | 'walkLeft' | 'walkRight'

/** The strip a walking pet shows, started over whenever it sets off, stops or turns. */
export class WalkCycle {
  private animation: Animation = 'idle'
  private startedAt = 0

  frame(sprite: PetSprite, walker: Walker, now: number): { frame: PetFrame; nextInMs: number } {
    const facing = walker.facing === 'left' ? 'walkLeft' : 'walkRight'
    const animation = isWalking(walker) ? facing : 'idle'
    if (animation !== this.animation) {
      this.animation = animation
      this.startedAt = now
    }
    return frameAt(sprite[animation], now - this.startedAt)
  }
}
