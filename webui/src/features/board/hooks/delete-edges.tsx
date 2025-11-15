import { useAppStore } from "@/store"
import { useGraphStore } from "../store/graph-store"
import { useRemoveLink } from "../api/remove-link"
import { useCallback } from "react"
import type { OnEdgesDelete } from "@xyflow/react"
import type { LinkEdge } from "../types/flow"


/**
 * A hook that returns a callback to handle edge deletions:
 * updates Zustand and persists deletions to the backend.
 */
export const useDeleteEdges = () => {
  const onEdgesDelete = useGraphStore(s => s.onEdgesDelete)
  const boardId = useGraphStore(s => s.boardId)
  const userId = useAppStore(s => s.userId)

  const { removeLink } = useRemoveLink()

  const handleDeleteEdges: OnEdgesDelete<LinkEdge> = useCallback((edges) => {
    if (!boardId || !userId) return
    onEdgesDelete(edges)
    edges.forEach(edge => {
      removeLink({ boardId, userId, linkId: edge.id })
    })
  }, [onEdgesDelete, boardId, userId, removeLink])

  return handleDeleteEdges
}