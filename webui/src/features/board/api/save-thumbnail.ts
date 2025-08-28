import { API_URL } from "@/config/api"

export async function saveThumbnail({
  userId,
  boardId,
  blob
}: {
  userId: string
  boardId: string
  blob: Blob
}) {
  const headers = new Headers()
  headers.append('X-User-Id', userId)
  headers.append('Accept', 'application/json')

  const form = new FormData()
  form.append('board_id', boardId)
  form.append('file', blob, 'thumb.png')

  const res = await fetch(`${API_URL}/boards/${boardId}/thumbnail`, {
    method: 'POST',
    body: form,
    headers
  })

  if (!res.ok) throw new Error(`failed to save thumbnail: ${res.status}`)
  const data = await res.json()
  return data.data.path
}
