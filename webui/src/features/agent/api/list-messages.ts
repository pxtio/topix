import camelcaseKeys from "camelcase-keys"
import type { ChatMessage, MessageRole } from "../types/chat"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/api"
import type { ToolExecutionState, ToolName } from "../types/stream"
import type { ToolOutput } from "../types/tool-outputs"


interface ListMessagesResponse {
  data: {
    messages: Array<{
      id: string,
      role: MessageRole,
      content: {
        markdown: string
      },
      created_at?: string,
      updated_at?: string,
      deleted_at?: string,
      chat_uid: string,
      properties: {
        reasoning: {
          type: "reasoning",
          reasoning: {
            id: string
            name: ToolName
            thought: string
            output: ToolOutput
            state: ToolExecutionState
            event_messages: string[]
          }[]
        }
      }
    }>
  }
}


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
  const res = await apiFetch<ListMessagesResponse>({
    path: `/chats/${chatId}/messages`,
    method: "GET",
    params: { user_id: userId },
  })
  return res.data.messages.map((message) => camelcaseKeys(message, { deep: true })) as ChatMessage[]
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
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // keep current data visible if something triggers a fetch elsewhere
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 5 // 5 minutes
  })
}