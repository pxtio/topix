// use-save-thumbnail-on-unmount.ts
import { useEffect, useRef, useCallback } from 'react'
import { useReactFlow, getViewportForBounds, type Rect } from '@xyflow/react'
import { toBlob } from 'html-to-image'

type Params = {
  boardId?: string
  userId?: string
  saveThumbnail: (args: { userId: string; boardId: string; blob: Blob }) => Promise<void>
  width?: number
  height?: number
}

export function useSaveThumbnailOnUnmount({
  boardId,
  userId,
  saveThumbnail,
  width = 360,
  height = 200
}: Params) {
  const { getNodes, getNodesBounds } = useReactFlow()

  // stable element snapshot managed by the hook
  const elRef = useRef<HTMLElement | null>(null)
  const setContainerRef = useCallback((el: HTMLElement | null) => {
    if (el) elRef.current = el
  }, [])

  // keep latest changing values without re-subscribing the effect
  const boardIdRef = useRef(boardId)
  const userIdRef = useRef(userId)
  const saveRef = useRef(saveThumbnail)
  useEffect(() => { boardIdRef.current = boardId }, [boardId])
  useEffect(() => { userIdRef.current = userId }, [userId])
  useEffect(() => { saveRef.current = saveThumbnail }, [saveThumbnail])

  const firedRef = useRef(false) // guard Strict Mode double cleanup

  // run cleanup only once on unmount
  useEffect(() => {
    return () => {
      if (firedRef.current) return
      firedRef.current = true

      ;(async () => {
        const bId = boardIdRef.current
        const uId = userIdRef.current
        if (!bId || !uId) return

        const container = elRef.current
        if (!container) return

        const viewportEl = container.querySelector('.react-flow__viewport') as HTMLElement | null
        if (!viewportEl) return

        const nodes = getNodes()
        const bounds: Rect =
          nodes.length ? getNodesBounds(nodes) : { x: 0, y: 0, width: 1, height: 1 }

        const { x, y, zoom } = getViewportForBounds(bounds, width, height, 0.1, 1, 0.1)

        toBlob(viewportEl, {
          backgroundColor: 'transparent',
          width,
          height,
          pixelRatio: 1,
          style: {
            width: `${width}px`,
            height: `${height}px`,
            transform: `translate(${x}px, ${y}px) scale(${zoom})`,
            transformOrigin: '0 0'
          },
          cacheBust: true
        }).then(blob => {
          if (blob) void saveRef.current({ userId: uId, boardId: bId, blob })
        }).catch(() => {})
      })()
    }
    // intentionally subscribe once; cleanup only on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // expose the ref callback for your wrapper div
  return { setContainerRef }
}