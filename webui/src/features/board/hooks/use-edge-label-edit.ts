import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactFlowProps } from '@xyflow/react'
import type { LinkEdge, NoteNode } from '../types/flow'
import type { Link } from '../types/link'
import { useGraphStore } from '../store/graph-store'
import { useDecoratedEdges } from './use-decorated-edges'

type UseEdgeLabelEditInput = {
  edges: LinkEdge[]
  isGraphView: boolean
}


const ensureLinkData = (edge: LinkEdge): Link => edge.data as Link


/**
 * Owns edge label editing state and callback wiring for edge rendering.
 */
export function useEdgeLabelEdit({
  edges,
  isGraphView,
}: UseEdgeLabelEditInput) {
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null)
  const [edgeLabelDraft, setEdgeLabelDraft] = useState<string>('')
  const updateEdgeByIdPersist = useGraphStore(state => state.updateEdgeByIdPersist)

  useEffect(() => {
    if (!isGraphView && editingEdgeId) {
      setEditingEdgeId(null)
      setEdgeLabelDraft('')
    }
  }, [isGraphView, editingEdgeId])

  useEffect(() => {
    if (!editingEdgeId) return
    const stillExists = edges.some(edge => edge.id === editingEdgeId)
    if (!stillExists) {
      setEditingEdgeId(null)
      setEdgeLabelDraft('')
    }
  }, [edges, editingEdgeId])

  const handleEdgeDoubleClick = useCallback<NonNullable<ReactFlowProps<NoteNode, LinkEdge>['onEdgeDoubleClick']>>(
    (event, edge) => {
      event.preventDefault()
      event.stopPropagation()
      setEditingEdgeId(edge.id)
      setEdgeLabelDraft(edge.data?.label?.markdown ?? '')
    },
    [],
  )

  const handleEdgeLabelChange = useCallback((value: string) => {
    setEdgeLabelDraft(value)
  }, [])

  const handleEdgeLabelCancel = useCallback(() => {
    setEditingEdgeId(null)
    setEdgeLabelDraft('')
  }, [])

  const handleEdgeControlPointChange = useCallback(
    (edgeId: string, position: { x: number; y: number }) => {
      updateEdgeByIdPersist(edgeId, edge => {
        const linkData = ensureLinkData(edge)
        const nextLink: Link = {
          ...linkData,
          properties: {
            ...linkData.properties,
            edgeControlPoint: { type: 'position', position },
          },
        }
        return {
          ...edge,
          data: nextLink,
        }
      })
    },
    [updateEdgeByIdPersist],
  )

  const handleEdgeLabelSave = useCallback(() => {
    if (!editingEdgeId) return
    const draft = edgeLabelDraft
    updateEdgeByIdPersist(editingEdgeId, edge => ({
      ...edge,
      data: {
        ...ensureLinkData(edge),
        label: draft.trim()
          ? { markdown: draft }
          : undefined,
      } as Link,
    }))
    setEditingEdgeId(null)
    setEdgeLabelDraft('')
  }, [editingEdgeId, edgeLabelDraft, updateEdgeByIdPersist])

  const edgesForRender = useDecoratedEdges({
    edges,
    editingEdgeId,
    edgeLabelDraft,
    onControlPointChange: handleEdgeControlPointChange,
    labelHandlers: {
      onLabelChange: handleEdgeLabelChange,
      onLabelSave: handleEdgeLabelSave,
      onLabelCancel: handleEdgeLabelCancel,
    },
  })

  return useMemo(
    () => ({
      edgesForRender,
      handleEdgeDoubleClick,
    }),
    [edgesForRender, handleEdgeDoubleClick],
  )
}
