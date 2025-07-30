import { API_URL } from "@/config/api"


/**
 * Create a new chat for the user.
 *
 * @param userId - The ID of the user for whom the chat is being created.
 */
export async function createNewChat(userId: string): Promise<string> {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")

  const response = await fetch(`${API_URL}/chats?user_id=${userId}`, {
    method: "PUT",
    headers
  })

  if (!response.ok) {
    throw new Error(`Failed to create chat: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data.chat_id
}