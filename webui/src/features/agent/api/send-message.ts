import { API_URL } from "@/config/api"
import type { AgentStreamMessage } from "../types/stream"
import type { SendMessageRequestPayload } from "./types"
import { handleStreamingResponse } from "../utils/stream/digest"
import { useChatStore } from "../store/chat-store"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type {ChatMessage } from "../types/chat"
import snakecaseKeys from "snakecase-keys"
import { buildResponse } from "../utils/stream/build"
import { fetchWithAuthRaw } from "@/api"


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
  userId: string,
  opts?: { signal?: AbortSignal }
): AsyncGenerator<AgentStreamMessage> {
  const url = new URL(`/chats/${chatId}/messages`, API_URL)
  url.searchParams.set("user_id", userId)

  // Build headers without Authorization; fetchWithAuthRaw adds it
  const headers = new Headers()
  headers.set("Content-Type", "application/json")

  const body = JSON.stringify(
    snakecaseKeys(payload as unknown as Record<string, unknown>, { deep: true })
  )

  const response = await fetchWithAuthRaw(url.toString(), {
    method: "POST",
    headers,
    body,
    cache: "no-store",
    keepalive: false,
    signal: opts?.signal,
  })

  if (!response.ok) {
    // If refresh failed, fetchWithAuthRaw may have redirected; this protects the generator
    throw new Error(`sendMessage failed: ${response.status} ${response.statusText}`)
  }

  // hand off to your streaming parser (SSE/NDJSON/etc.)
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

        let streamingMessageId: string | undefined
        let count = 0
        for await (const resp of response) {
          const { response: rep, isStop } = resp
          if (rep.steps.length === 0) {
            continue
          }
          count ++
          const step = rep.steps[0]
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
          if (count % 5 === 1 || isStop) {
            setStream(responseId, rep)
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