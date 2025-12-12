import { useCallback, useEffect, useRef, useState } from 'react'
import type React from 'react'

import type { AddNoteNodeOptions, CanvasPoint } from '../../hooks/add-node'


const MIN_DRAW_PIXELS = 6
const MIN_FLOW_SIZE = 24


type ScreenPoint = { x: number; y: number }
type ScreenRect = { x: number; y: number; width: number; height: number }
type PlacementPreview = ScreenRect
type ScreenToFlowFn = ((position: ScreenPoint) => CanvasPoint) | undefined

/**
 * Compute the normalized rectangle that spans two arbitrary screen points.
 */
const getRectFromPoints = (start: ScreenPoint, end: ScreenPoint): ScreenRect => {
  const x = Math.min(start.x, end.x)
  const y = Math.min(start.y, end.y)
  const width = Math.abs(start.x - end.x)
  const height = Math.abs(start.y - end.y)
  return { x, y, width, height }
}


interface NodePlacementOverlayProps {
  pendingPlacement: AddNoteNodeOptions | null
  screenToFlowPosition?: ScreenToFlowFn
  onPlace: (options: AddNoteNodeOptions) => void
  onCancel: () => void
}


/**
 * Handles the click-and-drag UX for placing new nodes onto the canvas.
 */
export function NodePlacementOverlay({
  pendingPlacement,
  screenToFlowPosition,
  onPlace,
  onCancel,
}: NodePlacementOverlayProps) {
  const [preview, setPreview] = useState<PlacementPreview | null>(null)
  const pointerStartRef = useRef<ScreenPoint | null>(null)
  const pointerRectRef = useRef<ScreenRect | null>(null)
  const pointerIdRef = useRef<number | null>(null)

  const resetPointerState = useCallback(() => {
    setPreview(null)
    pointerStartRef.current = null
    pointerRectRef.current = null
    pointerIdRef.current = null
  }, [])

  const finalizePlacement = useCallback(
    (rect: ScreenRect | null, endPoint: ScreenPoint) => {
      if (!pendingPlacement) return
      if (!screenToFlowPosition) {
        onCancel()
        return
      }

      const hasDrag =
        rect && rect.width > MIN_DRAW_PIXELS && rect.height > MIN_DRAW_PIXELS

      if (hasDrag && rect) {
        const topLeft = screenToFlowPosition({ x: rect.x, y: rect.y })
        const bottomRight = screenToFlowPosition({
          x: rect.x + rect.width,
          y: rect.y + rect.height,
        })
        const width = Math.max(Math.abs(bottomRight.x - topLeft.x), MIN_FLOW_SIZE)
        const height = Math.max(Math.abs(bottomRight.y - topLeft.y), MIN_FLOW_SIZE)
        onPlace({
          ...pendingPlacement,
          position: topLeft,
          size: { width, height },
        })
      } else {
        const point = screenToFlowPosition(endPoint)
        onPlace({
          ...pendingPlacement,
          position: point,
        })
      }

      resetPointerState()
    },
    [pendingPlacement, screenToFlowPosition, onPlace, onCancel, resetPointerState],
  )

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!pendingPlacement || event.button !== 0) return
      event.preventDefault()
      const start = { x: event.clientX, y: event.clientY }
      pointerStartRef.current = start
      pointerRectRef.current = null
      pointerIdRef.current = event.pointerId
      event.currentTarget.setPointerCapture(event.pointerId)
      const bounds = event.currentTarget.getBoundingClientRect()
      setPreview({
        x: start.x - bounds.left,
        y: start.y - bounds.top,
        width: 0,
        height: 0,
      })
    },
    [pendingPlacement],
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (
        !pendingPlacement ||
        pointerIdRef.current !== event.pointerId ||
        !pointerStartRef.current
      ) {
        return
      }

      event.preventDefault()
      const bounds = event.currentTarget.getBoundingClientRect()
      const current = { x: event.clientX, y: event.clientY }
      const rect = getRectFromPoints(pointerStartRef.current, current)
      pointerRectRef.current = rect
      setPreview({
        x: rect.x - bounds.left,
        y: rect.y - bounds.top,
        width: rect.width,
        height: rect.height,
      })
    },
    [pendingPlacement],
  )

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!pendingPlacement || pointerIdRef.current !== event.pointerId) return
      event.preventDefault()
      event.currentTarget.releasePointerCapture(event.pointerId)
      const start = pointerStartRef.current
      const endPoint = { x: event.clientX, y: event.clientY }
      let rect = pointerRectRef.current
      if (!rect && start) {
        rect = getRectFromPoints(start, endPoint)
      }
      finalizePlacement(rect, endPoint)
    },
    [pendingPlacement, finalizePlacement],
  )

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!pendingPlacement) return
      if (pointerIdRef.current !== null) {
        try {
          event.currentTarget.releasePointerCapture(pointerIdRef.current)
        } catch {
          // ignore if pointer already released
        }
      }
      resetPointerState()
      onCancel()
    },
    [pendingPlacement, onCancel, resetPointerState],
  )

  useEffect(() => {
    if (!pendingPlacement) {
      resetPointerState()
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [pendingPlacement, onCancel, resetPointerState])

  if (!pendingPlacement) {
    return null
  }

  return (
    <div
      className="absolute inset-0 z-40 cursor-crosshair"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onContextMenu={event => event.preventDefault()}
    >
      {preview && (
        <div
          className="absolute border-2 border-dashed border-secondary/80 bg-secondary/10 pointer-events-none"
          style={{
            left: preview.x,
            top: preview.y,
            width: Math.max(preview.width, 1),
            height: Math.max(preview.height, 1),
          }}
        />
      )}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow pointer-events-none">
        Click and drag to draw · Esc to cancel
      </div>
    </div>
  )
}
