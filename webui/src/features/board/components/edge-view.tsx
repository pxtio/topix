import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useInternalNode,
  type EdgeProps
} from '@xyflow/react'
import type { LinkEdge } from '../types/flow'
import { getEdgeParams } from '../utils/flow';
import { getAutoHandlePositions } from '../utils/edge-orientation';


/**
 * Custom edge view component for LinkEdge.
 */
export const EdgeView = ({
  source,
  target,
  style = {},
  markerEnd,
  data
}: EdgeProps<LinkEdge>) => {
  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)

  if (!sourceNode || !targetNode) {
    return null
  }

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode)

  const { sourcePosition, targetPosition } = getAutoHandlePositions(sx, sy, tx, ty)

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition,
    targetX: tx,
    targetY: ty,
    targetPosition,
  })

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={style}
      />
      {
        data && data.label && (
          <EdgeLabelRenderer>
            <div
              className="nodrag nopan absolute origin-center pointer-events-auto"
              style={{
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              }}
            >
              {data.label}
            </div>
          </EdgeLabelRenderer>
        )
      }
    </>
  )
}