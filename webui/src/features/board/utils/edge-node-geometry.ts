import type { NodeGeometry } from './flow'
import type { GraphStore } from '../store/graph-store'

export type EdgeNodeSlice = {
  x: number
  y: number
  w: number
  h: number
  shape: NodeGeometry['shape']
  attachedToNodeId?: string
}


function toEdgeNodeShape(type: unknown): NodeGeometry['shape'] {
  if (type === 'ellipse' || type === 'layered-circle') return 'ellipse'
  if (type === 'diamond' || type === 'soft-diamond' || type === 'layered-diamond') return 'diamond'
  return 'rectangle'
}


export function selectEdgeNodeSlice(nodeId: string) {
  return (state: GraphStore): EdgeNodeSlice | null => {
    const node = state.nodesById.get(nodeId)
    if (!node) return null
    const styleType = (node.data as { style?: { type?: string } } | undefined)?.style?.type
    return {
      x: node.position.x,
      y: node.position.y,
      w: node.measured?.width ?? node.width ?? 1,
      h: node.measured?.height ?? node.height ?? 1,
      shape: toEdgeNodeShape(styleType),
      attachedToNodeId: (node.data as { attachedToNodeId?: string } | undefined)?.attachedToNodeId,
    }
  }
}
