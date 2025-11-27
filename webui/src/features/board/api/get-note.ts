import camelcaseKeys from "camelcase-keys"
import type { Note } from "../types/note"
import { apiFetch } from "@/api"


/**
 * Fetch a note from a board for the user.
 *
 * @param boardId - The ID of the board containing the note.
 * @param noteId - The ID of the note to be fetched.
 * @returns A promise that resolves to the fetched note.
 */
export async function getNote(
  boardId: string,
  noteId: string
): Promise<Note> {
  const res = await apiFetch<{ data: Record<string, unknown> }>({
    path: `/boards/${boardId}/notes/${noteId}`,
    method: "GET"
  })
  return camelcaseKeys(res.data, { deep: true }) as Note
}