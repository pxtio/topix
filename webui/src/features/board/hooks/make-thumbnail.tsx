// use-save-thumbnail-interval.ts (or keep the same filename if you prefer)
import { useEffect, useRef, useCallback } from 'react'
import { useReactFlow, getViewportForBounds, type Rect } from '@xyflow/react'
import { toBlob } from 'html-to-image'

type Params = {
  boardId?: string
  saveThumbnail: (args: { boardId: string, blob: Blob }) => Promise<void>
  width?: number
  height?: number
  intervalMs?: number // default: 10s
}

export function useSaveThumbnail({
  boardId,
  saveThumbnail,
  width = 600,
  height = 400,
  intervalMs = 10_000,
}: Params) {
  const { getNodes, getNodesBounds } = useReactFlow()

  // stable element snapshot managed by the hook
  const elRef = useRef<HTMLElement | null>(null)
  const setContainerRef = useCallback((el: HTMLElement | null) => {
    elRef.current = el
  }, [])

  // keep latest changing values without recreating the interval
  const boardIdRef = useRef(boardId)
  const saveRef = useRef(saveThumbnail)

  useEffect(() => {
    boardIdRef.current = boardId
  }, [boardId])

  useEffect(() => {
    saveRef.current = saveThumbnail
  }, [saveThumbnail])

  const captureThumbnail = useCallback(async () => {
    const bId = boardIdRef.current
    if (!bId) return
    const container = elRef.current
    if (!container) return
    const viewportEl = container.querySelector('.react-flow__viewport') as HTMLElement | null
    if (!viewportEl) return
    const nodes = getNodes()
    const bounds: Rect =
      nodes.length ? getNodesBounds(nodes) : { x: 0, y: 0, width: 1, height: 1 }

    const { x, y, zoom } = getViewportForBounds(bounds, width, height, 0.1, 1, 0.1)

    try {
      const blob = await toBlob(viewportEl, {
        backgroundColor: 'transparent',
        width,
        height,
        pixelRatio: 1,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${x}px, ${y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        },
        cacheBust: true,
      })

      if (blob) {
        await saveRef.current({ boardId: bId, blob })
      }
    } catch (e) {
      // swallow errors; thumbnail generation is best-effort
      console.error('Failed to capture thumbnail', e)
    }
  }, [getNodes, getNodesBounds, width, height])

  // periodic autosave every intervalMs
  useEffect(() => {
    const id = window.setInterval(() => {
      void captureThumbnail()
    }, intervalMs)

    return () => {
      window.clearInterval(id)
    }
  }, [captureThumbnail, intervalMs])

  return { setContainerRef }
}
