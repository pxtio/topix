import { getBezierPath, type ConnectionLineComponentProps } from '@xyflow/react'
import type { NoteNode } from '../types/flow'


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
  const [edgePath] = getBezierPath({
    sourceX: fromX,
    sourceY: fromY,
    targetX: toX,
    targetY: toY,
  })

  return (
    <g>
      <path style={connectionLineStyle || {}} fill="none" d={edgePath} />
    </g>
  )
}