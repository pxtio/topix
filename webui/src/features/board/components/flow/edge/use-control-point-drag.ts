import { useEffect, useRef, useState } from 'react'
import type { Point } from './edge-geometry'

type UseControlPointDragArgs = {
  screenToFlowPosition: (point: { x: number; y: number }) => Point
  onCommit?: (point: Point) => void
}

type UseControlPointDragResult = {
  dragPoint: Point | null
  handlePointerDown: (event: React.PointerEvent<SVGCircleElement>) => void
}

/**
 * Handles control-point dragging for edge bend points.
 */
export function useControlPointDrag({
  screenToFlowPosition,
  onCommit
}: UseControlPointDragArgs): UseControlPointDragResult {
  const [dragPoint, setDragPoint] = useState<Point | null>(null)
  const dragPointRef = useRef<Point | null>(null)
  const moveRef = useRef<((event: PointerEvent) => void) | null>(null)
  const upRef = useRef<((event: PointerEvent) => void) | null>(null)

  useEffect(() => {
    return () => {
      if (moveRef.current) {
        window.removeEventListener('pointermove', moveRef.current)
      }
      if (upRef.current) {
        window.removeEventListener('pointerup', upRef.current)
        window.removeEventListener('pointercancel', upRef.current)
      }
    }
  }, [])

  const updatePoint = (clientX: number, clientY: number) => {
    const projected = screenToFlowPosition({ x: clientX, y: clientY })
    setDragPoint(projected)
    dragPointRef.current = projected
  }

  const handlePointerDown = (event: React.PointerEvent<SVGCircleElement>) => {
    event.stopPropagation()
    event.preventDefault()

    if (moveRef.current) {
      window.removeEventListener('pointermove', moveRef.current)
      moveRef.current = null
    }
    if (upRef.current) {
      window.removeEventListener('pointerup', upRef.current)
      window.removeEventListener('pointercancel', upRef.current)
      upRef.current = null
    }

    const handleMove = (moveEvent: PointerEvent) => {
      updatePoint(moveEvent.clientX, moveEvent.clientY)
    }

    const handleUp = () => {
      if (moveRef.current) {
        window.removeEventListener('pointermove', moveRef.current)
        moveRef.current = null
      }
      if (upRef.current) {
        window.removeEventListener('pointerup', upRef.current)
        window.removeEventListener('pointercancel', upRef.current)
        upRef.current = null
      }
      const finalPoint = dragPointRef.current
      if (finalPoint) {
        onCommit?.(finalPoint)
      }
      setDragPoint(null)
      dragPointRef.current = null
    }

    updatePoint(event.clientX, event.clientY)
    moveRef.current = handleMove
    upRef.current = handleUp
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
  }

  return { dragPoint, handlePointerDown }
}
