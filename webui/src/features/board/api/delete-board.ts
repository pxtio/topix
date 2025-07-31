import { API_URL } from "@/config/api"
import { useMutation, useQueryClient } from "@tanstack/react-query"


/**
 * Delete a board for the user.
 *
 * @param boardId - The ID of the board to be deleted.
 * @param userId - The ID of the user who owns the board.
 */
export function deleteBoard(
  boardId: string,
  userId: string
): Promise<void> {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")

  return fetch(`${API_URL}/boards/${boardId}?user_id=${userId}`, {
    method: "DELETE",
    headers,
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to delete board: ${response.statusText}`)
    }
  })
}


export const useDeleteBoard = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ boardId, userId }: { boardId: string, userId: string }) => {
      // Optimistically update the list of boards in the cache
      queryClient.setQueryData(["listBoards", userId], (oldBoards: { id: string, label?: string }[] | undefined) => {
        return oldBoards?.filter(board => board.id !== boardId)
      })

      await deleteBoard(boardId, userId)
    },
  })

  return { deleteBoard: mutation.mutate, ...mutation }
}