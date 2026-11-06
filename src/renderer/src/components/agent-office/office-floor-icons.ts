import { createElement } from 'react'
import { RepoIconGlyph } from '../repo/repo-icon'
import { orcaIcon } from './office-agent-badges'
import type { OfficeFloor } from './office-floors'
import { SIGN_TEXT, type SignIcon } from './office-scene'

/** The project's sidebar icon for its floor's wall sign, in the project's color; none in the lobby. */
export function floorSignIcon(floor: OfficeFloor): SignIcon | null {
  if (floor.number === 0) {
    return null
  }
  const icon = floor.repoIcon
  if (icon?.type === 'emoji') {
    return { emoji: icon.emoji }
  }
  const color = floor.badgeColor ?? SIGN_TEXT
  const look =
    icon?.type === 'image' ? `${icon.src.length}:${icon.src.slice(-48)}` : (icon?.name ?? '')
  const image = orcaIcon(`repo:${floor.id}:${look}:${color}`, () =>
    createElement(RepoIconGlyph, { repoIcon: icon, color })
  )
  return image ? { image } : null
}
