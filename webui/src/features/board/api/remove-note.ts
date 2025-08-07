import { API_URL } from "@/config/api"
import { sleep } from "@/lib/common"
import { useMutation } from "@tanstack/react-query"
import { DEBOUNCE_DELAY } from "../const"

/**
 * Remove a note from a board for the user.
 *
 * @param boardId - The ID of the board from which the note is to be removed.
 * @param userId - The ID of the user who owns the board.
 * @param noteId - The ID of the note to be removed.
 * @returns A promise that resolves when the note is successfully removed.
 */
export function removeNote(
  boardId: string,
  userId: string,
  noteId: string
): Promise<void> {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")

  return fetch(`${API_URL}/boards/${boardId}/notes/${noteId}?user_id=${userId}`, {
    method: "DELETE",
    headers
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to remove note: ${response.statusText}`)
    }
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
      userId,
      noteId
    }: {
      boardId: string
      userId: string
      noteId: string
    }) => {
      await sleep(DEBOUNCE_DELAY)
      await removeNote(boardId, userId, noteId)
    }
  })

  return { removeNote: mutation.mutate, ...mutation }
}