import { apiFetch } from "@/api"

export async function saveThumbnail({
  boardId,
  blob
}: {
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
      Accept: "application/json",
    }
  })
  return res.data.path
}
