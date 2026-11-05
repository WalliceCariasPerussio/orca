import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
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

// Why: Orca's own agent icons, rendered the way React recommends on the client: most are an SVG,
// the rest a favicon <img> whose file loads as it is.
function iconUrl(agentType: string): string | null {
  const host = document.createElement('div')
  const root = createRoot(host)
  flushSync(() => root.render(createElement(AgentTypeIcon, { agentType, size: ICON_PX })))
  const icon = host.firstElementChild
  const url =
    icon instanceof HTMLImageElement
      ? icon.getAttribute('src')
      : icon instanceof SVGSVGElement
        ? svgImageUrl(icon.outerHTML)
        : null
  root.unmount()
  return url
}

function loadIcon(agentType: string): void {
  icons.set(agentType, 'loading')
  // Why: the frame loop may ask mid-render elsewhere; flushSync needs its own task.
  window.setTimeout(() => {
    const url = iconUrl(agentType)
    if (!url) {
      icons.set(agentType, 'failed')
      return
    }
    const image = new Image()
    image.src = url
    image.decode().then(
      () => {
        icons.set(agentType, image)
        for (const listener of readyListeners) {
          listener()
        }
      },
      () => icons.set(agentType, 'failed')
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

/** The agent-kind badge at this zoom, or null while its icon is still loading. */
export function agentBadge(agentType: string, zoom: number): HTMLCanvasElement | null {
  const icon = icons.get(agentType)
  if (icon === undefined) {
    loadIcon(agentType)
    return null
  }
  if (typeof icon === 'string') {
    return null
  }
  const key = `${agentType}:${zoom}`
  const cached = badges.get(key)
  if (cached) {
    return cached
  }
  const badge = paintBadge(icon, zoom)
  badges.set(key, badge)
  return badge
}
