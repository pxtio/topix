// thumbnail.ts
import type { Rect } from '@xyflow/react'
import { toBlob } from 'html-to-image'

export type MakeThumbnailOpts = {
  width?: number
  height?: number
  pixelRatio?: number
  backgroundColor?: string
}

export async function makeThumbnailFromContainer(
  reactFlowContainer: HTMLElement,
  bounds: Rect,
  opts: MakeThumbnailOpts = {}
): Promise<Blob | null> {
  const {
    width = 360,
    height = 200,
    pixelRatio = 1,
    backgroundColor = '#ffffff',
  } = opts

  const viewportEl = reactFlowContainer.querySelector('.react-flow__viewport') as HTMLElement | null
  if (!viewportEl) return null

  // 6-arg signature: include padding
  const { getViewportForBounds } = await import('@xyflow/react')
  const { x, y, zoom } = getViewportForBounds(bounds, width, height, 0.5, 2, 0.1)

  const blob = await toBlob(viewportEl, {
    backgroundColor,
    width,
    height,
    pixelRatio,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${x}px, ${y}px) scale(${zoom})`,
      transformOrigin: '0 0',
    },
    cacheBust: true,
  })

  return blob ?? null
}