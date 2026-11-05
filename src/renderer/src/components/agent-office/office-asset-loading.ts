import {
  flattenManifest,
  type FurnitureAsset,
  type FurnitureManifest
} from './vendor/pixel-agents/core/src/assets/manifestUtils'
import { setFloorSprites } from './vendor/pixel-agents/webview-ui/src/office/floorTiles'
import {
  buildDynamicCatalog,
  type LoadedAssetData
} from './vendor/pixel-agents/webview-ui/src/office/layout/furnitureCatalog'
import { setCharacterTemplates } from './vendor/pixel-agents/webview-ui/src/office/sprites/spriteData'
import type { SpriteData } from './vendor/pixel-agents/webview-ui/src/office/types'
import { setWallSprites } from './vendor/pixel-agents/webview-ui/src/office/wallTiles'
import {
  characterFramesFromPixels,
  loadImagePixels,
  spriteFromPixels,
  wallPiecesFromPixels
} from './office-sprite-decoding'

const FLOOR_TILE_SIZE = 16

const furnitureManifests = import.meta.glob<FurnitureManifest>(
  './vendor/pixel-agents/webview-ui/public/assets/furniture/*/manifest.json',
  { eager: true, import: 'default' }
)
const furnitureImages = import.meta.glob<string>(
  './vendor/pixel-agents/webview-ui/public/assets/furniture/*/*.png',
  { eager: true, query: '?url', import: 'default' }
)
const floorImages = import.meta.glob<string>(
  './vendor/pixel-agents/webview-ui/public/assets/floors/*.png',
  { eager: true, query: '?url', import: 'default' }
)
const wallImages = import.meta.glob<string>(
  './vendor/pixel-agents/webview-ui/public/assets/walls/*.png',
  { eager: true, query: '?url', import: 'default' }
)
const characterImages = import.meta.glob<string>(
  './vendor/pixel-agents/webview-ui/public/assets/characters/*.png',
  { eager: true, query: '?url', import: 'default' }
)

function folderOf(path: string): string {
  return path.slice(0, path.lastIndexOf('/'))
}

function numberInName(path: string): number {
  return Number(/(\d+)\.png$/.exec(path)?.[1] ?? 0)
}

function urlsInNameOrder(images: Record<string, string>): string[] {
  return Object.keys(images)
    .sort((a, b) => numberInName(a) - numberInName(b))
    .map((path) => images[path])
}

function manifestAssets(manifest: FurnitureManifest): FurnitureAsset[] {
  if (manifest.type === 'asset') {
    const { width, height, footprintW, footprintH } = manifest
    if (width == null || height == null || footprintW == null || footprintH == null) {
      return []
    }
    return [
      {
        id: manifest.id,
        name: manifest.name,
        label: manifest.name,
        category: manifest.category,
        file: manifest.file ?? `${manifest.id}.png`,
        width,
        height,
        footprintW,
        footprintH,
        isDesk: manifest.category === 'desks',
        canPlaceOnWalls: manifest.canPlaceOnWalls,
        canPlaceOnSurfaces: manifest.canPlaceOnSurfaces,
        backgroundTiles: manifest.backgroundTiles,
        groupId: manifest.id
      }
    ]
  }
  if (!manifest.members) {
    return []
  }
  return flattenManifest(
    {
      type: 'group',
      groupType: manifest.groupType as 'rotation' | 'state' | 'animation',
      rotationScheme: manifest.rotationScheme,
      members: manifest.members
    },
    {
      groupId: manifest.id,
      name: manifest.name,
      category: manifest.category,
      canPlaceOnWalls: manifest.canPlaceOnWalls,
      canPlaceOnSurfaces: manifest.canPlaceOnSurfaces,
      backgroundTiles: manifest.backgroundTiles,
      ...(manifest.rotationScheme ? { rotationScheme: manifest.rotationScheme } : {})
    }
  )
}

async function loadFurniture(): Promise<LoadedAssetData> {
  const catalog: LoadedAssetData['catalog'] = []
  const sprites: Record<string, SpriteData> = {}
  const pending: Promise<void>[] = []
  for (const [manifestPath, manifest] of Object.entries(furnitureManifests)) {
    const folder = folderOf(manifestPath)
    for (const asset of manifestAssets(manifest)) {
      const url = furnitureImages[`${folder}/${asset.file}`]
      if (!url) {
        continue
      }
      catalog.push(asset)
      pending.push(
        loadImagePixels(url).then((pixels) => {
          sprites[asset.id] = spriteFromPixels(pixels, 0, 0, asset.width, asset.height)
        })
      )
    }
  }
  await Promise.all(pending)
  return { catalog, sprites }
}

async function loadAll(): Promise<void> {
  const [furniture, floors, walls, characters] = await Promise.all([
    loadFurniture(),
    Promise.all(urlsInNameOrder(floorImages).map(loadImagePixels)),
    Promise.all(urlsInNameOrder(wallImages).map(loadImagePixels)),
    Promise.all(urlsInNameOrder(characterImages).map(loadImagePixels))
  ])
  buildDynamicCatalog(furniture)
  setFloorSprites(floors.map((p) => spriteFromPixels(p, 0, 0, FLOOR_TILE_SIZE, FLOOR_TILE_SIZE)))
  setWallSprites(walls.map(wallPiecesFromPixels))
  setCharacterTemplates(characters.map(characterFramesFromPixels))
}

let loading: Promise<void> | null = null

// Why: the vendored engine keeps sprites in module state, so one load serves every visit.
export function loadOfficeAssets(): Promise<void> {
  loading ??= loadAll().catch((error: unknown) => {
    loading = null
    throw error
  })
  return loading
}
