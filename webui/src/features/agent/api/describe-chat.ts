import { API_URL } from "@/config/api"


/**
 * Describe a chat by its ID.
 */
export async function describeChat(
  chatId: string,
  userId: string
): Promise<string> {
  const headers = new Headers();
  headers.set("Content-Type", "application/json")
  const response = await fetch(`${API_URL}/chats/${chatId}:describe?user_id=${userId}`, {
      method: "POST",
      headers
  })

  if (!response.ok) {
    throw new Error(`Failed to describe chat: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data.label
}