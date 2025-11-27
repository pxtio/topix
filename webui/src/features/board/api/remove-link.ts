import { sleep } from "@/lib/common"
import { useMutation } from "@tanstack/react-query"
import { DEBOUNCE_DELAY } from "../const"
import { apiFetch } from "@/api"


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
  linkId: string
): Promise<void> {
  await apiFetch({
    path: `/boards/${boardId}/links/${linkId}`,
    method: "DELETE"
  })
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
      linkId
    }: {
      boardId: string
      linkId: string
    }) => {
      await sleep(DEBOUNCE_DELAY)
      await removeLink(boardId, linkId)
    }
  })

  return { removeLink: mutation.mutate, ...mutation }
}