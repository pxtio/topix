import { MiniMap, type Viewport } from '@xyflow/react'
import { useCallback, useMemo, useRef } from 'react'

import type { NoteNode } from '../../types/flow'
import { cn } from '@/lib/utils'

type Props = {
  nodes: NoteNode[]
  className?: string
  onNavigate: (target: { x: number; y: number }, currentZoom: number) => void
  getCurrentViewport: () => Viewport | null
}


/**
 * A MiniMap component that allows navigating the main viewport by clicking on it.
 */
export function NavigableMiniMap({ nodes, className, onNavigate, getCurrentViewport }: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const minimapClass = cn('!bg-sidebar overflow-hidden !relative !z-5 !p-0 !m-0', className)

  const bounds = useMemo(() => {
    if (!nodes.length) return null

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    nodes.forEach(node => {
      const width = node.width ?? 0
      const height = node.height ?? 0
      minX = Math.min(minX, node.position.x)
      minY = Math.min(minY, node.position.y)
      maxX = Math.max(maxX, node.position.x + width)
      maxY = Math.max(maxY, node.position.y + height)
    })

    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
      return null
    }

    // Avoid zero-size bounds to keep ratio math stable
    if (maxX - minX < 1) {
      minX -= 0.5
      maxX += 0.5
    }
    if (maxY - minY < 1) {
      minY -= 0.5
      maxY += 0.5
    }

    return { minX, minY, maxX, maxY }
  }, [nodes])

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!bounds) return
      if (!wrapperRef.current) return

      const rect = wrapperRef.current.getBoundingClientRect()
      if (!rect.width || !rect.height) return

      const relX = (event.clientX - rect.left) / rect.width
      const relY = (event.clientY - rect.top) / rect.height
      if (relX < 0 || relX > 1 || relY < 0 || relY > 1) return

      const targetX = bounds.minX + relX * (bounds.maxX - bounds.minX)
      const targetY = bounds.minY + relY * (bounds.maxY - bounds.minY)
      const currentViewport = getCurrentViewport()
      const zoom = currentViewport?.zoom ?? 1

      onNavigate({ x: targetX, y: targetY }, zoom)
    },
    [bounds, getCurrentViewport, onNavigate],
  )

  return (
    <div
      ref={wrapperRef}
      onClick={handleClick}
      className='minimap-wrapper absolute bottom-4 left-4 p-0 overflow-hidden rounded-md'
    >
      <MiniMap
        className={minimapClass}
        nodeClassName={(node) =>
          (node.data as { style?: { type?: string } } | undefined)?.style?.type === 'slide'
            ? 'minimap-hide-slide'
            : ''
        }
      />
    </div>
  )
}
