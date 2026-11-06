import { createElement, type ReactElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { Server } from 'lucide-react'
import { AgentTypeIcon } from '@/lib/agent-type-icon'
import { BUBBLE_FILL, BUBBLE_OUTLINE } from './office-bubbles'

/** Badge side in world pixels: a one-pixel frame around the agent-kind icon. */
export const BADGE_SIZE = 9
const ICON_PX = 64
/** Ink for icons drawn in currentColor, which an image cannot inherit. */
const ICON_INK = '#2A2B36'

const icons = new Map<string, HTMLImageElement | 'loading' | 'failed'>()
const badges = new Map<string, HTMLCanvasElement>()
const readyListeners = new Set<() => void>()

/** Runs whenever another badge icon has loaded; returns the unsubscribe. */
export function onBadgeReady(listener: () => void): () => void {
  readyListeners.add(listener)
  return () => readyListeners.delete(listener)
}

function svgImageUrl(markup: string): string {
  // Why: an SVG loaded as an image needs its namespace, and has no CSS color for currentColor.
  const namespaced = markup.includes('xmlns=')
    ? markup
    : markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  const inked = namespaced.replace('<svg', `<svg color="${ICON_INK}"`)
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(inked)}`
}

// Why: Orca's own icons, rendered the way React recommends on the client: most are an SVG,
// the rest a favicon <img> whose file loads as it is.
function iconUrl(element: ReactElement): string | null {
  const host = document.createElement('div')
  const root = createRoot(host)
  flushSync(() => root.render(element))
  // Why: some icons come wrapped in a span, like the project icon.
  const icon = host.querySelector('svg, img')
  const url =
    icon instanceof HTMLImageElement
      ? icon.getAttribute('src')
      : icon instanceof SVGSVGElement
        ? svgImageUrl(icon.outerHTML)
        : null
  root.unmount()
  return url
}

function loadIcon(key: string, element: () => ReactElement): void {
  icons.set(key, 'loading')
  // Why: the frame loop may ask mid-render elsewhere; flushSync needs its own task.
  window.setTimeout(() => {
    const url = iconUrl(element())
    if (!url) {
      icons.set(key, 'failed')
      return
    }
    const image = new Image()
    image.src = url
    image.decode().then(
      () => {
        icons.set(key, image)
        for (const listener of readyListeners) {
          listener()
        }
      },
      () => icons.set(key, 'failed')
    )
  }, 0)
}

function paintBadge(icon: HTMLImageElement, zoom: number): HTMLCanvasElement {
  const side = BADGE_SIZE * zoom
  const canvas = document.createElement('canvas')
  canvas.width = side
  canvas.height = side
  const context = canvas.getContext('2d')
  if (!context) {
    return canvas
  }
  context.fillStyle = BUBBLE_OUTLINE
  context.fillRect(zoom, 0, side - 2 * zoom, side)
  context.fillRect(0, zoom, side, side - 2 * zoom)
  context.fillStyle = BUBBLE_FILL
  context.fillRect(zoom, zoom, side - 2 * zoom, side - 2 * zoom)
  // Why: the icon is vector art scaled down, so it is smoothed unlike the pixel sprites around it.
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(icon, zoom * 1.5, zoom * 1.5, side - 3 * zoom, side - 3 * zoom)
  return canvas
}

/** An Orca icon drawn into an image for the canvas, or null while it loads or when it cannot. */
export function orcaIcon(key: string, element: () => ReactElement): HTMLImageElement | null {
  const icon = icons.get(key)
  if (icon === undefined) {
    loadIcon(key, element)
    return null
  }
  return typeof icon === 'string' ? null : icon
}

function badgeFor(
  key: string,
  element: () => ReactElement,
  zoom: number
): HTMLCanvasElement | null {
  const icon = orcaIcon(key, element)
  if (!icon) {
    return null
  }
  const sized = `${key}:${zoom}`
  const cached = badges.get(sized)
  if (cached) {
    return cached
  }
  const badge = paintBadge(icon, zoom)
  badges.set(sized, badge)
  return badge
}

/** The agent-kind badge at this zoom, or null while its icon is still loading. */
export function agentBadge(agentType: string, zoom: number): HTMLCanvasElement | null {
  return badgeFor(
    `agent:${agentType}`,
    () => createElement(AgentTypeIcon, { agentType, size: ICON_PX }),
    zoom
  )
}

/** The server badge the Agent Dashboard puts on an agent running on an SSH or remote Orca host. */
export function remoteHostBadge(zoom: number): HTMLCanvasElement | null {
  return badgeFor('host:remote', () => createElement(Server, { size: ICON_PX }), zoom)
}
