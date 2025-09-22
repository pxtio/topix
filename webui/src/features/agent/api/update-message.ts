import snakecaseKeys from "snakecase-keys"
import type { ChatMessage } from "../types/chat"
import { apiFetch } from "@/api"


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
  await apiFetch({
    path: `/chats/${chatId}/messages/${messageId}`,
    method: "PATCH",
    params: { user_id: userId },
    body: { data: snakecaseKeys(messageData, { deep: true }) }
  })
}