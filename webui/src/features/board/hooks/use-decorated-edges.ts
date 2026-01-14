import { useMemo } from 'react'

import type { LinkEdge } from '../types/flow'
import type { Link } from '../types/link'

type EdgeLabelHandlers = {
  onLabelChange: (value: string) => void
  onLabelSave: () => void
  onLabelCancel: () => void
}

type UseDecoratedEdgesInput = {
  edges: LinkEdge[]
  editingEdgeId: string | null
  edgeLabelDraft: string
  onControlPointChange: (edgeId: string, position: { x: number; y: number }) => void
  labelHandlers: EdgeLabelHandlers
}

export function useDecoratedEdges({
  edges,
  editingEdgeId,
  edgeLabelDraft,
  onControlPointChange,
  labelHandlers,
}: UseDecoratedEdgesInput): LinkEdge[] {
  const edgesWithHandlers = useMemo(() => {
    return edges.map(edge => {
      const baseLink = edge.data as Link | undefined
      if (!baseLink) return edge
      return {
        ...edge,
        data: {
          ...baseLink,
          onControlPointChange: (position: { x: number; y: number }) =>
            onControlPointChange(edge.id, position),
        } as Link,
      }
    })
  }, [edges, onControlPointChange])

  const edgesForRender = useMemo(() => {
    if (!editingEdgeId) return edgesWithHandlers

    return edgesWithHandlers.map(edge => {
      if (edge.id !== editingEdgeId) return edge
      const baseLink = edge.data as Link | undefined
      if (!baseLink) return edge

      return {
        ...edge,
        data: {
          ...baseLink,
          labelEditing: true,
          labelDraft: edgeLabelDraft,
          onLabelChange: labelHandlers.onLabelChange,
          onLabelSave: labelHandlers.onLabelSave,
          onLabelCancel: labelHandlers.onLabelCancel,
        } as Link,
      }
    })
  }, [
    edgesWithHandlers,
    editingEdgeId,
    edgeLabelDraft,
    labelHandlers.onLabelCancel,
    labelHandlers.onLabelChange,
    labelHandlers.onLabelSave,
  ])

  return edgesForRender
}
