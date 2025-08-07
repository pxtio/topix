import { API_URL } from "@/config/api"
import type { Note } from "../types/note"
import { useMutation } from "@tanstack/react-query"
import snakecaseKeys from "snakecase-keys"
import { sleep } from "@/lib/common"
import { DEBOUNCE_DELAY } from "../const"


/**
 * Add notes to a board for the user.
 *
 * @param boardId - The ID of the board to which notes are being added.
 * @param userId - The ID of the user who owns the board.
 * @param notes - An array of note objects to be added to the board.
 * @returns A promise that resolves when the notes have been successfully added.
 */
export async function addNotes(
  boardId: string,
  userId: string,
  notes: Note[]
): Promise<void> {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")

  const reformattedNotes = notes.map(note => snakecaseKeys(
    note as unknown as Record<string, unknown>,
    { deep: true }
  ))

  const response = await fetch(`${API_URL}/boards/${boardId}/notes?user_id=${userId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ notes: reformattedNotes })
  })

  if (!response.ok) {
    throw new Error(`Failed to add notes: ${response.statusText}`)
  }
}


/**
 * Custom hook to add notes to a board.
 *
 * @returns An object containing the addNotes function and its mutation state.
 */
export const useAddNotes = () => {
  const mutation = useMutation({
    mutationFn: async ({
      boardId,
      userId,
      notes
    }: {
      boardId: string
      userId: string
      notes: Note[]
    }) => {
      await sleep(DEBOUNCE_DELAY)
      await addNotes(boardId, userId, notes)
    }
  })

  return {
    addNotes: mutation.mutate,
    ...mutation
  }
}