import { API_URL } from "@/config/api"
import type { Note } from "../types/note"
import snakecaseKeys from "snakecase-keys"
import { useMutation } from "@tanstack/react-query"


/**
 * Update a note on a board for the user.
 *
 * @param boardId - The ID of the board containing the note.
 * @param userId - The ID of the user who owns the board.
 * @param noteId - The ID of the note to be updated.
 * @param updatedNote - The updated note data.
 * @returns A promise that resolves when the note has been successfully updated.
 */
export async function updateNote(
  boardId: string,
  userId: string,
  noteId: string,
  noteData: Partial<Note>
): Promise<void> {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")

  const response = await fetch(`${API_URL}/boards/${boardId}/notes/${noteId}?user_id=${userId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ data: snakecaseKeys(noteData, { deep: true }) })
  })

  if (!response.ok) {
    throw new Error(`Failed to update note: ${response.statusText}`)
  }
}


/**
 * Custom hook to update a note on a board.
 *
 * @returns An object containing the updateNote function and its mutation state.
 */
export const useUpdateNote = () => {
  const mutation = useMutation({
    mutationFn: async ({
      boardId,
      userId,
      noteId,
      noteData
    }: {
      boardId: string
      userId: string
      noteId: string
      noteData: Partial<Note>
    }) => {
      await updateNote(boardId, userId, noteId, noteData)
    }
  })

  return {
    updateNote: mutation.mutate,
    ...mutation
  }
}