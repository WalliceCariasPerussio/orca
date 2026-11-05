import { floorIndicator, type OfficeFloor } from './office-floors'

const RIDE_TOTAL_MS = 1600
const RIDE_STEP_MIN_MS = 90
const RIDE_STEP_MAX_MS = 260

export type ElevatorRide = {
  /** What the indicator shows at each floor passed, ending on the destination. */
  stops: string[]
  stepMs: number
}

export function planRide(
  floors: OfficeFloor[],
  from: OfficeFloor,
  to: OfficeFloor,
  lobbyShort: string
): ElevatorRide {
  const direction = to.number > from.number ? 1 : -1
  const arrow = direction > 0 ? '▲' : '▼'
  const stops: string[] = []
  for (let n = from.number + direction; n !== to.number + direction; n += direction) {
    const stop = floors.find((f) => f.number === n)
    stops.push(stop ? arrow + floorIndicator(stop, lobbyShort) : arrow)
  }
  const stepMs = Math.min(
    RIDE_STEP_MAX_MS,
    Math.max(RIDE_STEP_MIN_MS, RIDE_TOTAL_MS / Math.max(1, stops.length))
  )
  return { stops, stepMs }
}
