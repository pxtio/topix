import camelcaseKeys from "camelcase-keys"
import type { ChatMessage, MessageRole } from "../types/chat"
import { API_URL } from "@/config/api"
import { useQuery } from "@tanstack/react-query"


/**
 * List messages in a chat by its ID.
 *
 * @param chatId - The ID of the chat to list messages from.
 * @param userId - The ID of the user requesting the messages.
 */
export async function listMessages(
  chatId: string,
  userId: string
): Promise<ChatMessage[]> {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")
  const response = await fetch(`${API_URL}/chats/${chatId}/messages?user_id=${userId}`, {
    method: "GET",
    headers
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.statusText}`)
  }

  const data = await response.json()

  const resp =  data.data.messages.map((message: {
    id: string,
    role: MessageRole,
    content: string,
    created_at?: string,
    updated_at?: string,
    deleted_at?: string,
    chat_uid: string,
    reasoning_steps?: unknown
  }) => camelcaseKeys(message, { deep: true })) as ChatMessage[]
  return resp
}


/**
 * Custom hook to fetch messages for a chat.
 *
 * @param chatId - The ID of the chat whose messages are to be fetched.
 * @param userId - The ID of the user requesting the messages.
 *
 * @returns A query object containing the list of messages.
 */
export const useListMessages = ({
  chatId,
  userId
}: {
  chatId: string,
  userId: string
}) => {
  return useQuery<ChatMessage[]>({
    queryKey: ["listMessages", chatId, userId],
    queryFn: () => listMessages(chatId, userId),
    enabled: !!chatId && !!userId,
    staleTime: 1000 * 60 * 5 // 5 minutes
  })
}