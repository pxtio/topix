import { getStraightPath, type ConnectionLineComponentProps } from '@xyflow/react'
import { useMemo } from 'react'
import type { NoteNode } from '../../types/flow'


/**
 * Custom connection line component for React Flow.
 */
export function CustomConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  connectionLineStyle
}: ConnectionLineComponentProps<NoteNode>) {
  const [edgePath] = getStraightPath({
    sourceX: fromX,
    sourceY: fromY,
    targetX: toX,
    targetY: toY,
  })

  const markerId = useMemo(
    () => `connection-arrow-${Math.random().toString(36).slice(2, 8)}`,
    []
  )

  const strokeColor = 'var(--secondary)'
  const style = {
    stroke: strokeColor,
    strokeWidth: 2,
    strokeDasharray: '8 6',
    strokeLinecap: 'round',
    fill: 'none',
    ...(connectionLineStyle || {}),
  }

  return (
    <g>
      <defs>
        <marker
          id={markerId}
          viewBox='0 0 10 10'
          refX='10'
          refY='5'
          markerWidth='6'
          markerHeight='6'
          orient='auto'
        >
          <path d='M 0 0 L 10 5 L 0 10 z' fill={strokeColor} />
        </marker>
      </defs>
      <path
        style={style}
        d={edgePath}
        markerEnd={`url(#${markerId})`}
      />
    </g>
  )
}
