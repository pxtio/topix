import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { Graph } from "../types/board"
import { apiFetch } from "@/api"


/**
 * Delete a board for the user.
 *
 * @param boardId - The ID of the board to be deleted.
 * @param userId - The ID of the user who owns the board.
 */
export async function deleteBoard(
  boardId: string,
): Promise<void> {
  await apiFetch({
    path: `/boards/${boardId}`,
    method: "DELETE"
  })
}


export const useDeleteBoard = () => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ boardId }: { boardId: string }) => {
      // Optimistically update the list of boards in the cache
      queryClient.setQueryData(["listBoards"], (oldBoards: Graph[] | undefined) => {
        return oldBoards?.filter(board => board.uid !== boardId)
      })

      await deleteBoard(boardId)
    },
  })

  return { deleteBoard: mutation.mutate, ...mutation }
}