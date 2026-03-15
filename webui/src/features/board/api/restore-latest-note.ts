import camelcaseKeys from "camelcase-keys"
import { useMutation } from "@tanstack/react-query"

import { apiFetch } from "@/api"

import { useGraphStore } from "../store/graph-store"
import { reloadBoardIntoStore } from "./get-board"


type RestoreLatestNoteResponse = {
  note: Record<string, unknown>
}


/**
 * Restore the latest saved snapshot for a note.
 */
export async function restoreLatestNote(
  boardId: string,
  noteId: string,
): Promise<RestoreLatestNoteResponse> {
  const res = await apiFetch<{ data: Record<string, unknown> }>({
    path: `/boards/${boardId}/notes/${noteId}:restore-latest`,
    method: "POST",
  })

  return camelcaseKeys(res.data, { deep: true }) as RestoreLatestNoteResponse
}


/**
 * Restore the latest saved snapshot for a note and refresh the active board view.
 */
export const useRestoreLatestNote = () => {
  const mutation = useMutation({
    mutationFn: async ({
      boardId,
      noteId,
    }: {
      boardId: string
      noteId: string
    }) => {
      const restored = await restoreLatestNote(boardId, noteId)

      const { boardId: activeBoardId, rootId } = useGraphStore.getState()

      if (activeBoardId === boardId) {
        await reloadBoardIntoStore(boardId, rootId)
      }

      return restored
    }
  })

  return {
    restoreLatestNote: mutation.mutate,
    restoreLatestNoteAsync: mutation.mutateAsync,
    ...mutation,
  }
}
