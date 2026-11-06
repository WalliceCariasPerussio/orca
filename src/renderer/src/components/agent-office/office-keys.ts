import type { OfficeBuilding } from './office-building'

const STEP_KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0]
}

/** Arrow keys and WASD walk you a tile; Enter calls the elevator. */
export function handleOfficeKey(
  event: { key: string; preventDefault: () => void },
  building: OfficeBuilding | null
): void {
  const step = STEP_KEYS[event.key]
  if (step) {
    event.preventDefault()
    building?.step(step[0], step[1])
  } else if (event.key === 'Enter') {
    event.preventDefault()
    building?.callElevator()
  }
}
