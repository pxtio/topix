import { API_URL } from "@/config/api"
import type { Graph } from "../types/board"
import snakecaseKeys from "snakecase-keys"
import { useMutation, useQueryClient } from "@tanstack/react-query"


/**
 * Update a board for the user.
 *
 * @param boardId - The ID of the board to be updated.
 * @param userId - The ID of the user who owns the board.
 * @param graphData - The updated graph data for the board.
 * @returns A promise that resolves when the board is successfully updated.
 */
export async function updateBoard(
  boardId: string,
  userId: string,
  graphData: Partial<Graph>
): Promise<void> {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")

  const response = await fetch(`${API_URL}/boards/${boardId}?user_id=${userId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ data: snakecaseKeys(graphData, { deep: true }) })
  })

  if (!response.ok) {
    throw new Error(`Failed to update board: ${response.statusText}`)
  }
}


/**
 * Custom hook to update a board.
 *
 * @returns An object containing the updateBoard function and its mutation state.
 */
export const useUpdateBoard = () => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({
      boardId,
      userId,
      graphData
    }: {
      boardId: string
      userId: string
      graphData: Partial<Graph>
    }) => {
      queryClient.setQueryData(["listBoards", userId], (oldBoards: { id: string, label?: string }[] | undefined) => {
        return oldBoards?.map(board =>
          board.id === boardId ? { ...board, ...{ id: boardId, label: graphData.label } } : board
        )
      })
      await updateBoard(boardId, userId, graphData)
    }
  })

  return { updateBoard: mutation.mutate, ...mutation }
}