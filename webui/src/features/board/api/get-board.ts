import type { Graph } from "../types/board"
import camelcaseKeys from "camelcase-keys"
import { useMutation } from "@tanstack/react-query"
import { useGraphStore } from "../store/graph-store"
import { convertLinkToEdgeWithPoints, convertNoteToNode } from "../utils/graph"
import type { LinkEdge, NoteNode } from "../types/flow"
import { apiFetch } from "@/api"


/**
 * Fetch a board by its ID for the user.
 *
 * @param boardId - The ID of the board to be fetched.
 * @returns A promise that resolves to the board object.
 */
export async function getBoard(
  boardId: string,
): Promise<Graph> {
  const res = await apiFetch<{ data: Record<string, unknown> }>({
    path: `/boards/${boardId}`,
    method: "GET"
  })
  const data = camelcaseKeys(res.data, { deep: true })
  return data.graph as Graph
}


/**
 * Custom hook to fetch a board by its ID for the user.
 */
export const useGetBoard = () => {
  // no selectors here → no subscription
  const mutation = useMutation({
    mutationFn: async (): Promise<boolean> => {
      const { boardId, setNodes, setEdges, isLoading, setIsLoading } = useGraphStore.getState()
      if (!boardId) return false
      if (isLoading) return false
      setIsLoading(true)
      try {
        const { nodes: notes, edges: links } = await getBoard(boardId)
        const nodes = (notes ?? []).map(convertNoteToNode)
        const edges: LinkEdge[] = []
        const pointNodes: NoteNode[] = []

        for (const link of links ?? []) {
          const { edge, points } = convertLinkToEdgeWithPoints(link)
          edges.push(edge)
          if (points.length) {
            pointNodes.push(...points)
          }
        }

        setNodes([...nodes, ...pointNodes])
        setEdges(edges)
        return true
      } finally {
        setIsLoading(false)
      }
    },
  })

  return {
    getBoard: mutation.mutate,
    getBoardAsync: mutation.mutateAsync,
    ...mutation,
  }
}
