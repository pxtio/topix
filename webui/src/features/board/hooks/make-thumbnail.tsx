import { useEffect, useRef } from 'react'
import { useReactFlow, getViewportForBounds, type Rect } from '@xyflow/react'
import { toBlob } from 'html-to-image'

type ThumbOpts = {
  width?: number
  height?: number
  pixelRatio?: number
  backgroundColor?: string | 'transparent'
  minZoom?: number
  maxZoom?: number
  padding?: number
}

type Params = {
  boardId?: string
  containerRef: React.RefObject<HTMLElement | null>
  saveThumbnail: (boardId: string, blob: Blob) => Promise<void>
  opts?: ThumbOpts
}

export function useSaveThumbnailOnUnmount({
  boardId,
  containerRef,
  saveThumbnail,
  opts,
}: Params) {
  const { getNodes, getNodesBounds } = useReactFlow()
  const busy = useRef(false) // prevent double fire
  const mounted = useRef(false)

  const {
    width = 320,
    height = 180,
    pixelRatio = 1,
    backgroundColor = 'transparent',
    minZoom = 0.5,
    maxZoom = 2,
    padding = 0.1,
  } = opts ?? {}

  useEffect(() => {
    mounted.current = true

    // snapshot the DOM node once so cleanup doesn't chase a changing ref
    const container = containerRef.current

    const capture = async () => {
      if (busy.current) return
      busy.current = true

      try {
        if (!mounted.current) return
        if (!boardId || !container) return

        const viewportEl = container.querySelector('.react-flow__viewport') as HTMLElement | null
        if (!viewportEl) return

        const nodes = getNodes()
        const bounds: Rect = nodes.length ? getNodesBounds(nodes) : { x: 0, y: 0, width: 1, height: 1 }
        const { x, y, zoom } = getViewportForBounds(bounds, width, height, minZoom, maxZoom, padding)

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
        if (blob) await saveThumbnail(boardId, blob)
      } finally {
        busy.current = false
      }
    }

    // only fire on *real* page hide (navigating away, closing tab, bfcache, etc.)
    const onPageHide = () => { capture() }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') capture()
    }

    // NB: don't use beforeunload unless you absolutely must, it's more fragile
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      mounted.current = false
      // remove listeners *without* doing any capture in cleanup
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      // final safety: if we're unmounting without a pagehide (e.g., internal route change),
      // trigger one last capture
      // queue a microtask so removal happens first and we don't block the commit
      queueMicrotask(() => { capture() })
    }
    // empty deps: runs once, no re-subscribe, no re-cleanup on updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
