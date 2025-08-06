import { API_URL } from "@/config/api"
import { sleep } from "@/lib/common"
import { useMutation } from "@tanstack/react-query"
import { DEBOUNCE_DELAY } from "../const"


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
      await sleep(DEBOUNCE_DELAY)
      await removeLink(boardId, userId, linkId)
    }
  })

  return { removeLink: mutation.mutate, ...mutation }
}