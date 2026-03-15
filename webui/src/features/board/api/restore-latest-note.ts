import camelcaseKeys from "camelcase-keys"
import { useMutation } from "@tanstack/react-query"

import { apiFetch } from "@/api"

import { useGraphStore } from "../store/graph-store"
import { convertLinkToEdgeWithPoints, convertNoteToNode } from "../utils/graph"
import { getBoard } from "./get-board"


type RestoreLatestNoteResponse = {
  note: Record<string, unknown>
}


/**
 * Restore the latest saved snapshot for a note.
 */
export async function restoreLatestNote(
  boardId: string,
  noteId: string,
): Promise<RestoreLatestNoteResponse> {
  const res = await apiFetch<{ data: Record<string, unknown> }>({
    path: `/boards/${boardId}/notes/${noteId}:restore-latest`,
    method: "POST",
  })

  return camelcaseKeys(res.data, { deep: true }) as RestoreLatestNoteResponse
}


/**
 * Restore the latest saved snapshot for a note and refresh the active board view.
 */
export const useRestoreLatestNote = () => {
  const mutation = useMutation({
    mutationFn: async ({
      boardId,
      noteId,
    }: {
      boardId: string
      noteId: string
    }) => {
      const restored = await restoreLatestNote(boardId, noteId)

      const {
        boardId: activeBoardId,
        rootId,
        setNodes,
        setEdges,
        setBoardVisibility,
        setBoardCanEdit,
        setBoardLabel,
      } = useGraphStore.getState()

      if (activeBoardId === boardId) {
        const { graph, canEdit } = await getBoard(boardId, rootId)
        const nodes = (graph.nodes ?? []).map(convertNoteToNode)
        const nodesById = new Map(nodes.map(node => [node.id, node]))
        const edges = []
        const pointNodes = []

        for (const link of graph.edges ?? []) {
          const { edge, points } = convertLinkToEdgeWithPoints(link, nodesById)
          edges.push(edge)
          if (points.length) {
            pointNodes.push(...points)
          }
        }

        const loadedNodes = [...nodes, ...pointNodes]
        const readonlyNodes = canEdit
          ? loadedNodes
          : loadedNodes.map(node => ({
              ...node,
              draggable: false,
              selectable: false,
            }))

        setNodes(readonlyNodes)
        setEdges(edges)
        setBoardVisibility(graph.visibility ?? "private")
        setBoardCanEdit(canEdit)
        setBoardLabel(graph.label ?? "")
      }

      return restored
    }
  })

  return {
    restoreLatestNote: mutation.mutate,
    restoreLatestNoteAsync: mutation.mutateAsync,
    ...mutation,
  }
}
