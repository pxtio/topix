type CacheEntry = {
  canvas: HTMLCanvasElement
  width: number
  height: number
}

const roughCanvasCache = new Map<string, CacheEntry>()

const hasDocument = typeof document !== 'undefined'

function createCanvas(): HTMLCanvasElement {
  if (!hasDocument) {
    throw new Error('rough canvas cache requires document environment')
  }
  return document.createElement('canvas')
}

export function serializeCacheKey(parts: Array<string | number | boolean | undefined>): string {
  return parts
    .map(part => {
      if (part === undefined) return ''
      if (typeof part === 'boolean') return part ? '1' : '0'
      return String(part)
    })
    .join('|')
}

/**
 * Returns a cached canvas for the given key, re-rendering via the renderer callback
 * whenever the key or output size changes.
 */
export function getCachedCanvas(
  key: string,
  width: number,
  height: number,
  renderer: (canvas: HTMLCanvasElement) => void,
): HTMLCanvasElement {
  let entry = roughCanvasCache.get(key)
  if (entry && entry.width === width && entry.height === height) {
    return entry.canvas
  }

  const canvas = entry?.canvas ?? createCanvas()

  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height

  renderer(canvas)

  entry = { canvas, width, height }
  roughCanvasCache.set(key, entry)
  return canvas
}

/**
 * Allows freeing specific cached canvases if needed.
 */
export function deleteCachedCanvas(key: string): void {
  roughCanvasCache.delete(key)
}

/**
 * Clears all cached rough canvases.
 */
export function clearRoughCanvasCache(): void {
  roughCanvasCache.clear()
}
