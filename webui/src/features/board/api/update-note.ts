import type { Note } from "../types/note"
import snakecaseKeys from "snakecase-keys"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/api"


/**
 * Update a note on a board for the user.
 *
 * @param boardId - The ID of the board containing the note.
 * @param noteId - The ID of the note to be updated.
 * @param updatedNote - The updated note data.
 * @returns A promise that resolves when the note has been successfully updated.
 */
export async function updateNote(
  boardId: string,
  noteId: string,
  noteData: Partial<Note>
): Promise<void> {
  await apiFetch({
    path: `/boards/${boardId}/notes/${noteId}`,
    method: "PATCH",
    body: { data: snakecaseKeys(noteData, { deep: true }) }
  })
}


/**
 * Custom hook to update a note on a board.
 *
 * @returns An object containing the updateNote function and its mutation state.
 */
export const useUpdateNote = () => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({
      boardId,
      noteId,
      noteData
    }: {
      boardId: string
      noteId: string
      noteData: Partial<Note>
    }) => {
      await updateNote(boardId, noteId, noteData)
    },
    onMutate: async ({ boardId, noteId, noteData }) => {
      const key = ["note", boardId, noteId]
      await queryClient.cancelQueries({ queryKey: key })

      const previous = queryClient.getQueryData<Note>(key)

      if (previous) {
        const optimistic: Note = {
          ...previous,
          ...noteData,
          label: noteData.label ?? previous.label,
          content: noteData.content ?? previous.content,
        }
        queryClient.setQueryData(key, optimistic)
      }

      return { key, previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(ctx.key, ctx.previous)
      }
    },
    onSettled: (_data, _error, variables, ctx) => {
      const key = ctx?.key ?? ["note", variables.boardId, variables.noteId]
      queryClient.invalidateQueries({ queryKey: key })
    },
  })

  return {
    updateNote: mutation.mutate,
    ...mutation
  }
}
