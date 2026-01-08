import { useCallback, useEffect, useRef, useState } from 'react'
import type React from 'react'

import type { CanvasPoint } from '../../hooks/add-node'

const MIN_DRAW_PIXELS = 6

type ScreenPoint = { x: number; y: number }
type ScreenToFlowFn = ((position: ScreenPoint) => CanvasPoint) | undefined

interface LinePlacementOverlayProps {
  pending: boolean
  screenToFlowPosition?: ScreenToFlowFn
  onPlace: (start: CanvasPoint, end: CanvasPoint) => void
  onCancel: () => void
}

export function LinePlacementOverlay({
  pending,
  screenToFlowPosition,
  onPlace,
  onCancel,
}: LinePlacementOverlayProps) {
  const [start, setStart] = useState<ScreenPoint | null>(null)
  const [end, setEnd] = useState<ScreenPoint | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const reset = useCallback(() => {
    setStart(null)
    setEnd(null)
    pointerIdRef.current = null
  }, [])

  const finalize = useCallback(
    (startPoint: ScreenPoint | null, endPoint: ScreenPoint | null) => {
      if (!pending || !startPoint || !endPoint || !screenToFlowPosition) {
        onCancel()
        return
      }
      const dx = Math.abs(endPoint.x - startPoint.x)
      const dy = Math.abs(endPoint.y - startPoint.y)
      if (dx < MIN_DRAW_PIXELS && dy < MIN_DRAW_PIXELS) {
        onCancel()
        return
      }
      onPlace(screenToFlowPosition(startPoint), screenToFlowPosition(endPoint))
    },
    [pending, screenToFlowPosition, onPlace, onCancel],
  )

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!pending || event.button !== 0) return
      event.preventDefault()
      const startPoint = { x: event.clientX, y: event.clientY }
      setStart(startPoint)
      setEnd(startPoint)
      pointerIdRef.current = event.pointerId
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [pending],
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!pending || pointerIdRef.current !== event.pointerId || !start) return
      event.preventDefault()
      setEnd({ x: event.clientX, y: event.clientY })
    },
    [pending, start],
  )

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!pending || pointerIdRef.current !== event.pointerId) return
      event.preventDefault()
      event.currentTarget.releasePointerCapture(event.pointerId)
      const endPoint = { x: event.clientX, y: event.clientY }
      finalize(start, endPoint)
      reset()
    },
    [pending, finalize, reset, start],
  )

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!pending) return
      if (pointerIdRef.current !== null) {
        try {
          event.currentTarget.releasePointerCapture(pointerIdRef.current)
        } catch {
          // ignore if pointer already released
        }
      }
      reset()
      onCancel()
    },
    [pending, onCancel, reset],
  )

  useEffect(() => {
    if (!pending) {
      reset()
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [pending, onCancel, reset])

  if (!pending) return null

  const bounds = containerRef.current?.getBoundingClientRect()
  const line = start && end && bounds ? {
    x1: start.x - bounds.left,
    y1: start.y - bounds.top,
    x2: end.x - bounds.left,
    y2: end.y - bounds.top,
  } : null

  return (
    <div
      className="absolute inset-0 z-40 cursor-crosshair"
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onContextMenu={event => event.preventDefault()}
    >
      {line && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <line
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="var(--secondary)"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        </svg>
      )}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow pointer-events-none">
        Click start then end · Esc to cancel
      </div>
    </div>
  )
}
