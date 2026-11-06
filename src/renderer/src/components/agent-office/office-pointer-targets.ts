import type { OfficeHover } from './office-building-setup'
import type { OfficeTarget } from './office-floor-crew'
import { cssAtWorld, type OfficeProjection } from './office-scene'

/** The label for what the pointer rests on; spots nobody would guess are clickable have none. */
export function hoverOf(
  target: OfficeTarget | null,
  projection: OfficeProjection
): OfficeHover | null {
  const tip =
    target?.kind === 'agent'
      ? target.hit.tip
      : target?.kind === 'sector'
        ? target.tip
        : target?.spot.tip
  if (!target || !tip) {
    return null
  }
  const at = cssAtWorld(projection, tip.x, tip.y)
  if (target.kind === 'agent') {
    return { kind: 'agent', agent: target.hit.agent, seenAt: Date.now(), ...at }
  }
  return target.kind === 'sector'
    ? { kind: 'sector', worktreeName: target.worktreeName, ...at }
    : { kind: 'spot', spot: target.spot.id, seenAt: Date.now(), ...at }
}

/** The workspace of the agent or plaque under the pointer, whose menu a right-click opens. */
export function sectorOf(target: OfficeTarget | null): string | null {
  if (target?.kind === 'agent') {
    return target.hit.agent.worktreeId
  }
  return target?.kind === 'sector' ? target.worktreeId : null
}
