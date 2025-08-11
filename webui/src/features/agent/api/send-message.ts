import { API_URL } from "@/config/api"
import type { AgentStreamMessage } from "../types/stream"
import type { SendMessageRequestPayload } from "./types"
import { buildResponse, handleStreamingResponse } from "../utils/stream"
import { useChatStore } from "../store/chat-store"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { Chat, ChatMessage } from "../types/chat"
import { generateUuid, trimText } from "@/lib/common"
import { createNewChat } from "./create-chat"
import { describeChat } from "./describe-chat"
import snakecaseKeys from "snakecase-keys"


/**
 * Send a message to the AI assistant.
 *
 * @param payload - The message payload to send.
 * @param chatId - The ID of the chat to send the message to.
 *
 * @returns An async generator that yields the streamed response messages.
 */
export async function* sendMessage(
  payload: SendMessageRequestPayload,
  chatId: string,
  userId: string
): AsyncGenerator<AgentStreamMessage> {
  const headers = new Headers()
  headers.set("Content-Type", "application/json")

  const response = await fetch(`${API_URL}/chats/${chatId}/messages?user_id=${userId}`, {
    method: "POST",
    headers,
    body: JSON.stringify(snakecaseKeys(
      payload as unknown as Record<string, unknown>,
      { deep: true }
    )),
    cache: 'no-store',
    keepalive: false
  })

  yield* handleStreamingResponse<AgentStreamMessage>(response)
}


/**
 * Custom hook to send a message to the AI assistant.
 *
 * @returns An object containing the sendMessage function and its state.
 */
export const useSendMessage = () => {
  const { setStream, setIsStreaming, setCurrentChatId, currentChatId, setStreamingMessageId } = useChatStore()

  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({
      payload,
      userId
    }: {
      payload: SendMessageRequestPayload,
      userId: string
    }) => {
      setIsStreaming(true)
      // Optimistically update the chat messages in the query cache
      try {
        let newChatCreated = false
        let chatId = currentChatId
        if (!chatId) {
          newChatCreated = true
          chatId = await createNewChat(userId)
          if (chatId) {
            const newId = chatId
            queryClient.setQueryData<Chat[]>(
              ["listChats", userId],
              (oldChats) => {
                const newChat = { id: -1, uid: newId, label: trimText(payload.query, 20), createdAt: new Date().toISOString(), userId }
                return [newChat, ...(oldChats || [])]
              }
            )
          }

          setCurrentChatId(chatId)
        }

        if (!chatId) {
          return
        }
        queryClient.setQueryData<ChatMessage[]>(
          ["listMessages", chatId, userId],
          (oldMessages) => [
            ...(oldMessages || []),
            { id: generateUuid(), role: "user", content: payload.query, chatUid: chatId }
          ]
        )
        const stream = sendMessage(payload, chatId, userId)
        const response = buildResponse(stream)
        let setNewAssistantMessageId = false
        const streamingBatchSize = 2

        let iterations = 0
        let streamingMessageId: string | undefined
        for await (const resp of response) {
          iterations++
          if (resp.response.steps.length === 0) {
            continue
          }

          const step = resp.response.steps[0]
          const responseId = step.id

          if (!streamingMessageId) {
            streamingMessageId = step.id
            setStreamingMessageId(streamingMessageId)
          }

          if (!setNewAssistantMessageId) {
            setNewAssistantMessageId = true
            queryClient.setQueryData<ChatMessage[]>(
              ["listMessages", chatId, userId],
              (oldMessages) => [
                ...(oldMessages || []),
                { id: responseId, role: "assistant", content: "", chatUid: chatId }
              ]
            )
          }
          if (iterations % streamingBatchSize === 1 || resp.toolEvent) {
            setStream(responseId, resp.response)
          }
        }
        if (newChatCreated) {
          // describe chat after creating it
          const label = await describeChat(chatId, userId)
          queryClient.setQueryData<Chat[]>(
            ["listChats", userId],
            (oldChats) => {
              if (!oldChats) return []
              return oldChats.map(chat =>
                chat.uid === chatId
                  ? { ...chat, label } // Replace with a new object
                  : chat
              )
            }
          )
        }
      } catch (error) {
        console.error("Error sending message:", error)
        throw error
      } finally {
        setIsStreaming(false)
        setStreamingMessageId(undefined)
      }
    }
  })
  return {
    sendMessage: mutation.mutate,
    ...mutation
  }
}