import { apiFetch } from "@/api"
import { useQuery } from "@tanstack/react-query"
import camelcaseKeys from "camelcase-keys"
import type { Note } from "../types/note"


type GetNotePathResponse = {
  path: Note[]
}


export async function getNotePath(boardId: string, noteId: string): Promise<Note[]> {
  const res = await apiFetch<{ data: Record<string, unknown> }>({
    path: `/boards/${boardId}/notes/${noteId}/path`,
    method: "GET",
  })
  const data = camelcaseKeys(res.data, { deep: true }) as GetNotePathResponse
  return data.path ?? []
}


export const useGetNotePath = ({
  boardId,
  noteId,
  enabled = true,
}: {
  boardId?: string
  noteId?: string
  enabled?: boolean
}) =>
  useQuery({
    queryKey: ["note-path", boardId, noteId],
    queryFn: () => getNotePath(boardId!, noteId!),
    enabled: !!boardId && !!noteId && enabled,
    staleTime: 30_000,
  })
