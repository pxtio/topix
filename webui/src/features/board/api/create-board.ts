import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useGraphStore } from "../store/graph-store"
import type { Graph } from "../types/board"
import { apiFetch } from "@/api"


/**
 * Create a new board for the user.
 */
export async function createBoard(): Promise<string> {
  const res = await apiFetch<{ data: { graph_id: string } }>({
    path: "/boards",
    method: "PUT"
  })
  return res.data.graph_id
}


/**
 * Custom hook to create a new board for the user.
 *
 * @returns An object containing the createBoard function and its mutation state.
 */
export const useCreateBoard = () => {
  const queryClient = useQueryClient()

  const { setBoardId, setNodes, setEdges } = useGraphStore()

  const mutation = useMutation({
    mutationFn: async () => {
      const boardId = await createBoard()
      queryClient.setQueryData(["listBoards"], (oldBoards: Graph[] | undefined) => {
        const newBoard = { uid: boardId } as Graph // Temporary ID until the server responds
        return [newBoard, ...(oldBoards || [])] // Prepend the new board to the list
      })
      setBoardId(boardId) // Set the current board ID to the newly created board
      setNodes([])
      setEdges([])
      return boardId
    }
  })

  return {
    createBoard: mutation.mutate,
    createBoardAsync: mutation.mutateAsync,
    ...mutation
  }
}