import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useGraphStore } from "../store/graph-store"
import type { Graph } from "../types/board"
import { apiFetch } from "@/api"


/**
 * Create a new board for the user.
 *
 * @param userId - The ID of the user for whom the board is being created.
 */
export async function createBoard(
  userId: string
): Promise<string> {
  const res = await apiFetch<{ data: { graph_id: string } }>({
    path: "/boards",
    method: "PUT",
    params: { user_id: userId }
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
    mutationFn: async ({ userId }: { userId: string }) => {
      const boardId = await createBoard(userId)
      queryClient.setQueryData(["listBoards", userId], (oldBoards: Graph[] | undefined) => {
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