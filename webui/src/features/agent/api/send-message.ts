import { API_URL } from "@/config/api"
import type { AgentResponse, ReasoningStep } from "../types/stream"
import type { SendMessageRequestPayload } from "./types"
import { handleStreamingResponse } from "../utils/stream/digest"
import { useChatStore } from "../store/chat-store"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { ChatMessage } from "../types/chat"
import snakecaseKeys from "snakecase-keys"
import { buildResponse } from "../utils/stream/build"
import { fetchWithAuthRaw } from "@/api"
import type { ToolOutput } from "../types/tool-outputs"
import { trimResponseAnnotations } from "../utils/annotations"


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
): AsyncGenerator<Record<string, unknown>> {
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
  yield* handleStreamingResponse<Record<string, unknown>>(response)
}


/**
 * Custom hook to send a message to the AI assistant.
 *
 * @returns An object containing the sendMessage function and its state.
 */
export const useSendMessage = () => {
  const setIsStreaming = useChatStore((state) => state.setIsStreaming)

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
      const key = ['listMessages', chatId, userId] as const
      setIsStreaming(true)

      await queryClient.cancelQueries({ queryKey: key, exact: true })

      // Optimistically update the chat messages in the query cache
      const newUserMessage = {
        id: payload.messageId,
        role: "user",
        content: { markdown: payload.query },
        chatUid: chatId,
        properties: {}
      } as ChatMessage

      const tmpId = "placeholder-" + Date.now().toString()

      const isDeepResearch = payload.useDeepResearch
      const newAssistantPlaceholder = {
        id: tmpId,
        role: "assistant",
        content: { markdown: "" },
        chatUid: chatId,
        properties: { reasoning: { type: "reasoning", reasoning: [] } },
        streaming: true,
        isDeepResearch,
        sentAt: new Date().toISOString()
      } as ChatMessage

      const newMessages = [newUserMessage, newAssistantPlaceholder]

      try {
        queryClient.setQueryData<ChatMessage[]>(
          key,
          (oldMessages) => [
            ...(oldMessages || []),
            ...newMessages
          ]
        )
        const stream = sendMessage(payload, chatId, userId)
        const response = buildResponse(stream)
        let setNewAssistantMessageId = false

        for await (const resp of response) {
          const { response: rep, isStop } = resp
          if (rep.steps.length === 0) {
            continue
          }

          const safeResponse = trimResponseAnnotations(
            sanitizeResponseForStreaming(rep, isStop)
          )
          const step = safeResponse.steps[0]
          const responseId = step.id

          if (!setNewAssistantMessageId) {
            setNewAssistantMessageId = true

            queryClient.setQueryData<ChatMessage[]>(
              key,
              (oldMessages) => {
                let msgs = oldMessages || []
                if (!oldMessages || oldMessages.length === 0) {
                  msgs = [...newMessages]
                }
                return msgs.map((m) => {
                  if (m.id === tmpId) {
                    return {
                      ...m,
                      id: responseId
                    } as ChatMessage
                  }
                  return m
                })
              }
            )
          } else {
            queryClient.setQueryData<ChatMessage[]>(
              ["listMessages", chatId, userId],
              (oldMessages) => {
                let msgs = oldMessages || []
                if (!oldMessages || oldMessages.length === 0) {
                  msgs = [...newMessages]
                }
                return msgs.map((m) => {
                  const lastStep = safeResponse.steps[safeResponse.steps.length - 1]
                  let content = ""
                  if (lastStep.name === 'synthesizer' || lastStep.name === 'answer_reformulate') {
                    content = typeof lastStep.output === 'string' ? lastStep.output : ''
                  }
                  if (m.id === responseId) {
                    return {
                      ...m,
                      content: { markdown: content },
                      properties: {
                        ...m.properties,
                        reasoning: {
                          type: "reasoning",
                          reasoning: safeResponse.steps
                        }
                      },
                      streaming: !isStop
                    } as ChatMessage
                  }
                  return m
                })
              }
            )
          }
        }
      } catch (error) {
        console.error("Error sending message:", error)
        throw error
      } finally {
        setIsStreaming(false)
        await queryClient.invalidateQueries({ queryKey: key, exact: true })
      }
    }
  })
  return {
    sendMessage: mutation.mutate,
    sendMessageAsync: mutation.mutateAsync,
    ...mutation
  }
}

const STREAMING_EVENT_CAP = 10

const sanitizeResponseForStreaming = (response: AgentResponse, isStop: boolean): AgentResponse => {
  if (isStop) return response
  return {
    ...response,
    steps: response.steps.map((step) => sanitizeStep(step))
  }
}

const sanitizeStep = (step: ReasoningStep): ReasoningStep => {
  const eventMessages = step.eventMessages.slice(-STREAMING_EVENT_CAP)
  const output = typeof step.output === "string" ? step.output : sanitizeToolOutput(step.output)
  return {
    ...step,
    eventMessages,
    output
  }
}

const sanitizeToolOutput = (output: ToolOutput): ToolOutput => {
  if (typeof output === "string") return output

  switch (output.type) {
    case "web_search":
      return { type: "web_search", answer: "", searchResults: [] }
    case "memory_search":
      return { type: "memory_search", answer: "", references: [] }
    case "code_interpreter":
      return { type: "code_interpreter", answer: "", executedCode: "", annotations: [] }
    case "display_weather_widget":
      return { type: "display_weather_widget", city: "" }
    case "display_stock_widget":
      return { type: "display_stock_widget", symbol: "" }
    case "display_image_search_widget":
      return { type: "display_image_search_widget", query: "", images: [] }
    case "image_generation":
      return { type: "image_generation", imageUrls: [] }
    default:
      return output
  }
}
