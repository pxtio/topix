import snakecaseKeys from "snakecase-keys"
import type { ChatMessage } from "../types/chat"
import { API_URL } from "@/config/api"


/**
 * Update a message in a chat.
 *
 * @param chatId - The ID of the chat containing the message.
 * @param messageId - The ID of the message to update.
 * @param userId - The ID of the user who owns the chat.
 * @param messageData - The updated message data.
 * @returns A promise that resolves when the message is successfully updated.
 */
export async function updateMessage(
  chatId: string,
  messageId: string,
  userId: string,
  messageData: Partial<ChatMessage>
): Promise<void> {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")

  const response = await fetch(`${API_URL}/chats/${chatId}/messages/${messageId}?user_id=${userId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ data: snakecaseKeys(messageData, { deep: true }) })
  })

  if (!response.ok) {
    throw new Error(`Failed to update message: ${response.statusText}`)
  }
}