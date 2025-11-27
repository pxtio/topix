import { sleep } from "@/lib/common"
import { useMutation } from "@tanstack/react-query"
import { DEBOUNCE_DELAY } from "../const"
import { apiFetch } from "@/api"

/**
 * Remove a note from a board for the user.
 *
 * @param boardId - The ID of the board from which the note is to be removed.
 * @param noteId - The ID of the note to be removed.
 * @returns A promise that resolves when the note is successfully removed.
 */
export async function removeNote(
  boardId: string,
  noteId: string
): Promise<void> {
  await apiFetch({
    path: `/boards/${boardId}/notes/${noteId}`,
    method: "DELETE"
  })
}


/**
 * Custom hook to remove a note from a board.
 *
 * @returns An object containing the removeNote function and its mutation state.
 */
export const useRemoveNote = () => {
  const mutation = useMutation({
    mutationFn: async ({
      boardId,
      noteId
    }: {
      boardId: string
      noteId: string
    }) => {
      await sleep(DEBOUNCE_DELAY)
      await removeNote(boardId, noteId)
    }
  })

  return { removeNote: mutation.mutate, ...mutation }
}