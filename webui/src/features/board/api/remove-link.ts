import { API_URL } from "@/config/api"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { Graph } from "../types/board"


/**
 * Remove a link from a board for the user.
 *
 * @param boardId - The ID of the board from which the link is to be removed.
 * @param userId - The ID of the user who owns the board.
 * @param linkId - The ID of the link to be removed.
 * @returns A promise that resolves when the link is successfully removed.
 */
export async function removeLink(
  boardId: string,
  userId: string,
  linkId: string
): Promise<void> {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")

  const response = await fetch(`${API_URL}/boards/${boardId}/links/${linkId}?user_id=${userId}`, {
    method: "DELETE",
    headers
  })

  if (!response.ok) {
    throw new Error(`Failed to remove link: ${response.statusText}`)
  }
}


/**
 * Custom hook to remove a link from a board.
 *
 * @returns An object containing the removeLink function and its mutation state.
 */
export const useRemoveLink = () => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({
      boardId,
      userId,
      linkId
    }: {
      boardId: string
      userId: string
      linkId: string
    }) => {
      // Optimistically update the board in the cache
      queryClient.setQueryData<Graph>(["getBoard", boardId, userId], (oldBoard) => {
        if (!oldBoard) return oldBoard

        // Remove the edge from the board's edges array
        const updatedEdges = oldBoard.edges?.filter(edge => edge.id !== linkId)
        return { ...oldBoard, edges: updatedEdges }
      })

      await removeLink(boardId, userId, linkId)
    }
  })

  return { removeLink: mutation.mutate, ...mutation }
}