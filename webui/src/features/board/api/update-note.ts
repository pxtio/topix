import type { Note } from "../types/note"
import snakecaseKeys from "snakecase-keys"
import { useMutation } from "@tanstack/react-query"
import { apiFetch } from "@/api"


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
  await apiFetch({
    path: `/boards/${boardId}/notes/${noteId}`,
    method: "PATCH",
    params: { user_id: userId },
    body: { data: snakecaseKeys(noteData, { deep: true }) }
  })
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