import { useCallback } from "react"
import { useRemoveNote } from "../api/remove-note"
import { useGraphStore } from "../store/graph-store"
import type { OnNodesDelete } from "@xyflow/react"
import type { NoteNode } from "../types/flow"


/**
 * A hook that returns a callback to handle node deletions:
 * updates Zustand and persists deletions to the backend.
 */
export const useDeleteNodes = () => {
  const onNodesDelete = useGraphStore(s => s.onNodesDelete)
  const boardId = useGraphStore(s => s.boardId)

  const { removeNote } = useRemoveNote()

  const handleDeleteNodes: OnNodesDelete<NoteNode> = useCallback((nodes) => {
    if (!boardId) return
    onNodesDelete(nodes)
    nodes.forEach(node => {
      removeNote({ boardId, noteId: node.id })
    })
  }, [onNodesDelete, boardId, removeNote])

  return handleDeleteNodes
}