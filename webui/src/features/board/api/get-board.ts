import { API_URL } from "@/config/api"
import type { Graph } from "../types/board"
import camelcaseKeys from "camelcase-keys"
import { useMutation } from "@tanstack/react-query"
import { useAppStore } from "@/store"
import { useGraphStore } from "../store/graph-store"
import { convertLinkToEdge, convertNoteToNode } from "../utils/graph"


/**
 * Fetch a board by its ID for the user.
 *
 * @param boardId - The ID of the board to be fetched.
 * @param userId - The ID of the user who owns the board.
 * @returns A promise that resolves to the board object.
 */
export async function getBoard(
  boardId: string,
  userId: string
): Promise<Graph> {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")

  const response = await fetch(`${API_URL}/boards/${boardId}?user_id=${userId}`, {
    method: "GET",
    headers
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch board: ${response.statusText}`)
  }

  const data = await response.json()
  return camelcaseKeys(data.data.graph, { deep: true })
}


/**
 * Custom hook to fetch a board by its ID for the user.
 */
export const useGetBoard = () => {
  const userId = useAppStore((state) => state.userId)
  const { boardId, setNodes, setEdges, setIsLoading } = useGraphStore()

  const mutation = useMutation({
    mutationFn: async () => {
      if (!boardId) {
        return
      }
      setIsLoading(true)
      const { nodes: notes, edges: links } = await getBoard(boardId, userId)
      const nodes = (notes || []).map(convertNoteToNode)
      const edges = (links || []).map(convertLinkToEdge)

      setNodes(nodes)
      setEdges(edges)
      setIsLoading(false)
    }
  })

  return {
    getBoard: mutation.mutate,
    ...mutation
  }
}