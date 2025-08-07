import camelcaseKeys from "camelcase-keys"
import type { Note } from "../types/note"
import { API_URL } from "@/config/api"


/**
 * Fetch a note from a board for the user.
 *
 * @param boardId - The ID of the board containing the note.
 * @param userId - The ID of the user who owns the board.
 * @param noteId - The ID of the note to be fetched.
 * @returns A promise that resolves to the fetched note.
 */
export async function getNote(
  boardId: string,
  userId: string,
  noteId: string
): Promise<Note> {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")

  const response = await fetch(`${API_URL}/boards/${boardId}/notes/${noteId}?user_id=${userId}`, {
    method: "GET",
    headers
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch note: ${response.statusText}`)
  }

  const resp = await response.json()
  return camelcaseKeys(resp.data, { deep: true }) as Note
}