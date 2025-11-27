import type { Graph } from "../types/board"
import snakecaseKeys from "snakecase-keys"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/api"


/**
 * Update a board for the user.
 *
 * @param boardId - The ID of the board to be updated.
 * @param graphData - The updated graph data for the board.
 * @returns A promise that resolves when the board is successfully updated.
 */
export async function updateBoard(
  boardId: string,
  graphData: Partial<Graph>
): Promise<void> {
  await apiFetch({
    path: `/boards/${boardId}`,
    method: "PATCH",
    body: { data: snakecaseKeys(graphData, { deep: true }) }
  })
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
      graphData
    }: {
      boardId: string
      graphData: Partial<Graph>
    }) => {
      queryClient.setQueryData(["listBoards"], (oldBoards: Graph[] | undefined) => {
        return oldBoards?.map(board =>
          board.uid === boardId ? { ...board, ...{ ...graphData, uid: boardId } } : board
        )
      })
      await updateBoard(boardId, graphData)
    }
  })

  return { updateBoard: mutation.mutate, ...mutation }
}