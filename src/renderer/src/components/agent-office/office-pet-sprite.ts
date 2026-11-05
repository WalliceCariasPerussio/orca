import type { CustomPet, SpriteAnimation } from '../../../../shared/pet-types'
import { CODEX_PET_ANIMATIONS } from '../../../../shared/codex-pet-sprite-defaults'

export type PetFrame = {
  image: CanvasImageSource
  sx: number
  sy: number
  sw: number
  sh: number
  durationMs: number
}

/** Source pixels of the drawn figure inside a frame; anchors feet and sets the scale. */
export type PetFigure = { x: number; y: number; width: number; height: number }

export type PetSprite = {
  idle: PetFrame[]
  walkLeft: PetFrame[]
  walkRight: PetFrame[]
  /** Sheet pets act out an agent's state; single-image pets only have `idle`. */
  states?: Partial<Record<'working' | 'attention' | 'done', PetFrame[]>>
  figure: PetFigure
}

// Same pairing as the Orca pet: running while working, waiting for you, review when done.
const STATE_STRIPS = { working: 'running', attention: 'waiting', done: 'review' } as const

type SheetGrid = NonNullable<CustomPet['sprite']>

const OPAQUE_ALPHA = 8
const MAX_FRAME_HEIGHT = 128
const FALLBACK_FRAME_MS = 100
const sprites = new Map<string, Promise<PetSprite>>()

function measureFigure(
  image: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number
): PetFigure {
  const canvas = new OffscreenCanvas(sw, sh)
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    return { x: 0, y: 0, width: sw, height: sh }
  }
  context.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh)
  const data = context.getImageData(0, 0, sw, sh).data
  let minX = sw
  let minY = sh
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      if (data[(y * sw + x) * 4 + 3] > OPAQUE_ALPHA) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }
  return maxX < 0
    ? { x: 0, y: 0, width: sw, height: sh }
    : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

async function loadStaticImage(url: string): Promise<PetSprite> {
  const image = new Image()
  image.src = url
  await image.decode()
  const frame = {
    image,
    sx: 0,
    sy: 0,
    sw: image.naturalWidth,
    sh: image.naturalHeight,
    durationMs: Number.POSITIVE_INFINITY
  }
  const figure = measureFigure(image, 0, 0, frame.sw, frame.sh)
  return { idle: [frame], walkLeft: [frame], walkRight: [frame], figure }
}

// Why: canvases draw only the first frame of an animated <img>, so each frame is decoded up front.
async function loadAnimatedImage(url: string): Promise<PetSprite> {
  const response = await fetch(url)
  const type = response.headers.get('content-type')?.split(';')[0] || 'image/webp'
  if (typeof ImageDecoder === 'undefined' || !(await ImageDecoder.isTypeSupported(type))) {
    return loadStaticImage(url)
  }
  const decoder = new ImageDecoder({ data: await response.arrayBuffer(), type })
  try {
    await decoder.tracks.ready
    const count = decoder.tracks.selectedTrack?.frameCount ?? 1
    const first = (await decoder.decode({ frameIndex: 0 })).image
    const full = measureFigure(first, 0, 0, first.displayWidth, first.displayHeight)
    const padX = Math.round(full.width * 0.2)
    const padY = Math.round(full.height * 0.1)
    const crop = {
      x: Math.max(0, full.x - padX),
      y: Math.max(0, full.y - padY),
      width: Math.min(first.displayWidth, full.x + full.width + padX) - Math.max(0, full.x - padX),
      height:
        Math.min(first.displayHeight, full.y + full.height + padY) - Math.max(0, full.y - padY)
    }
    first.close()
    const scale = Math.min(1, MAX_FRAME_HEIGHT / crop.height)
    const width = Math.max(1, Math.round(crop.width * scale))
    const height = Math.max(1, Math.round(crop.height * scale))
    const frames: PetFrame[] = []
    for (let frameIndex = 0; frameIndex < count; frameIndex++) {
      const { image } = await decoder.decode({ frameIndex })
      const bitmap = await createImageBitmap(image, crop.x, crop.y, crop.width, crop.height, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: 'high'
      })
      const durationMs = (image.duration ?? 0) / 1000 || FALLBACK_FRAME_MS
      image.close()
      frames.push({ image: bitmap, sx: 0, sy: 0, sw: width, sh: height, durationMs })
    }
    const figure = {
      x: (full.x - crop.x) * scale,
      y: (full.y - crop.y) * scale,
      width: full.width * scale,
      height: full.height * scale
    }
    return { idle: frames, walkLeft: frames, walkRight: frames, figure }
  } finally {
    decoder.close()
  }
}

function stripFrames(image: ImageBitmap, grid: SheetGrid, strip: SpriteAnimation): PetFrame[] {
  const uniformMs = 1000 / Math.max(1, grid.fps)
  return Array.from({ length: strip.frames }, (_, i) => ({
    image,
    sx: i * grid.frameWidth,
    sy: strip.row * grid.frameHeight,
    sw: grid.frameWidth,
    sh: grid.frameHeight,
    durationMs: strip.frameDurationsMs?.[i] ?? uniformMs
  }))
}

async function loadSheet(url: string, grid: SheetGrid): Promise<PetSprite> {
  const image = await createImageBitmap(await (await fetch(url)).blob())
  const animations = grid.animations ?? CODEX_PET_ANIMATIONS
  const idleStrip = animations.idle ?? Object.values(animations)[0] ?? CODEX_PET_ANIMATIONS.idle
  const idle = stripFrames(image, grid, idleStrip)
  const rightStrip = animations['running-right']
  const leftStrip = animations['running-left']
  const walkRight = rightStrip ? stripFrames(image, grid, rightStrip) : idle
  const walkLeft = leftStrip ? stripFrames(image, grid, leftStrip) : walkRight
  const states: NonNullable<PetSprite['states']> = {}
  for (const [state, stripName] of Object.entries(STATE_STRIPS)) {
    const strip = animations[stripName]
    if (strip && strip.row < grid.rows) {
      states[state as keyof typeof STATE_STRIPS] = stripFrames(image, grid, strip)
    }
  }
  const firstIdle = idle[0]
  const figure = measureFigure(image, firstIdle.sx, firstIdle.sy, firstIdle.sw, firstIdle.sh)
  return { idle, walkLeft, walkRight, states, figure }
}

/** Load once per pet image; the office reuses decoded frames across visits. */
export function loadPetSprite(url: string, grid: SheetGrid | null): Promise<PetSprite> {
  const key = grid ? `${url}#grid` : url
  let pending = sprites.get(key)
  if (!pending) {
    pending = grid ? loadSheet(url, grid) : loadAnimatedImage(url)
    pending.catch(() => sprites.delete(key))
    sprites.set(key, pending)
  }
  return pending
}

export function totalDuration(frames: PetFrame[]): number {
  return frames.reduce((sum, frame) => sum + frame.durationMs, 0)
}

/** Frame showing `elapsedMs` into a looping strip, and ms until the next frame. */
export function frameAt(
  frames: PetFrame[],
  elapsedMs: number
): { frame: PetFrame; nextInMs: number } {
  const total = totalDuration(frames)
  if (!Number.isFinite(total) || total <= 0) {
    return { frame: frames[0], nextInMs: Number.POSITIVE_INFINITY }
  }
  let t = elapsedMs % total
  for (const frame of frames) {
    if (t < frame.durationMs) {
      return { frame, nextInMs: frame.durationMs - t }
    }
    t -= frame.durationMs
  }
  return { frame: frames[0], nextInMs: frames[0].durationMs }
}
