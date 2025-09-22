import { apiFetch } from "@/api"

export async function saveThumbnail({
  userId,
  boardId,
  blob
}: {
  userId: string
  boardId: string
  blob: Blob
}) {
  const form = new FormData()
  form.append('board_id', boardId)
  form.append('file', blob, 'thumb.png')

  const res = await apiFetch<{ data: { path: string } }>({
    path: `/boards/${boardId}/thumbnail`,
    method: "POST",
    body: form,
    headers: {
      "X-User-Id": userId,
      Accept: "application/json",
    }
  })
  return res.data.path
}
