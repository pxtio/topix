import { API_URL } from "@/config/api"
import type { AgentStreamMessage } from "../types/stream"
import type { SendMessageRequestPayload } from "./types"
import { buildResponse, handleStreamingResponse } from "../utils/stream"
import { useChatStore } from "../store/chat-store"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type {ChatMessage } from "../types/chat"
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
  const { setStream, setIsStreaming, setStreamingMessageId } = useChatStore()

  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({
      payload,
      userId,
      chatId,
    }: {
      payload: SendMessageRequestPayload,
      userId: string,
      chatId: string
    }) => {
      setIsStreaming(true)

      // Optimistically update the chat messages in the query cache
      const newUserMessage = {
        id: payload.messageId,
        role: "user",
        content: { markdown: payload.query },
        chatUid: chatId,
        properties: {}
      } as ChatMessage

      try {
        queryClient.setQueryData<ChatMessage[]>(
          ["listMessages", chatId, userId],
          (oldMessages) => [
            ...(oldMessages || []),
            newUserMessage
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
              (oldMessages) => {
                const newAssistantMessage = {
                  id: responseId,
                  role: "assistant",
                  content: { markdown: "" },
                  chatUid: chatId,
                  properties: { reasoning: { type: "reasoning", reasoning: [] } }
                } as ChatMessage

                const check = oldMessages && oldMessages.length > 0 && oldMessages[oldMessages.length - 1].id === newUserMessage.id

                if (!check) {
                  return [...(oldMessages || []), newUserMessage, newAssistantMessage]
                }
                return [
                  ...(oldMessages || []),
                  newAssistantMessage
                ]
              }
            )
          }
          if (iterations % streamingBatchSize === 1 || resp.toolEvent) {
            setStream(responseId, resp.response)
          }
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
    sendMessageAsync: mutation.mutateAsync,
    ...mutation
  }
}