import { API_URL } from "@/config/api"


/**
 * Create a new chat for the user.
 *
 * @param userId - The ID of the user for whom the chat is being created.
 */
export async function createNewChat(userId: string, boardId?: string): Promise<string> {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")

  const url = new URL("/chats", API_URL)

  // query params
  const params = new URLSearchParams()
  params.set("user_id", userId)
  if (boardId) {
    params.set("board_id", boardId)
  }

  url.search = params.toString()

  const response = await fetch(url.toString(), {
    method: "PUT",
    headers
  })

  if (!response.ok) {
    throw new Error(`Failed to create chat: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data.chat_id
}