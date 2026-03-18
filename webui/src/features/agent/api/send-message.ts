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
import { useGraphStore } from "@/features/board/store/graph-store"
import { getBoardNote } from "@/features/board/api/get-board"
import { convertNoteToNode } from "@/features/board/utils/graph"
import type { NoteNode } from "@/features/board/types/flow"
import type { CreateNoteOutput, EditNoteOutput } from "../types/tool-outputs"
import { isReasoningTextStep, isToolCallStep, normalizeReasoningSteps } from "../types/stream"


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
        properties: payload.messageContext
          ? {
            context: {
              type: "text",
              text: payload.messageContext
            }
          }
          : {}
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

          if (!setNewAssistantMessageId) {
            setNewAssistantMessageId = true

            queryClient.setQueryData<ChatMessage[]>(
              key,
              (oldMessages) => {
                let msgs = oldMessages || []
                if (!oldMessages || oldMessages.length === 0) {
                  msgs = [...newMessages]
                }
                return msgs
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
                  const content = safeResponse.steps
                    .filter(isReasoningTextStep)
                    .map((step) => step.message)
                    .join("")
                  if (m.id === tmpId) {
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
        const messages = queryClient.getQueryData<ChatMessage[]>(key) ?? []

        const userMessageIndex = messages.findIndex(
          (message) => message.id === payload.messageId && message.role === "user",
        )
        const completedMessage = userMessageIndex >= 0
          ? messages.slice(userMessageIndex + 1).find((message) => message.role === "assistant")
          : undefined

        const noteToolOutputs = collectNoteToolOutputs(
          completedMessage?.properties.reasoning?.reasoning ?? [],
        )

        if (noteToolOutputs.length > 0) {
          const {
            boardId: activeBoardId,
            setNodesPersist,
          } = useGraphStore.getState()

          if (activeBoardId) {
            for (const output of noteToolOutputs) {
              if (output.graphUid !== activeBoardId || !output.noteId) continue

              try {
                const note = await getBoardNote(activeBoardId, output.noteId)
                const fetchedNode = convertNoteToNode(note)
                setNodesPersist((prevNodes) =>
                  applyRemoteNoteNode(prevNodes, fetchedNode, output.type === "create_note"),
                { persist: false })
              } catch (error) {
                console.error("Failed to apply remote note update locally:", error)
              }
            }
          }
        }
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
  const normalizedSteps = normalizeReasoningSteps(response.steps)
  if (isStop) {
    return {
      ...response,
      steps: normalizedSteps,
    }
  }
  return {
    ...response,
    steps: normalizedSteps.map((step) => sanitizeStep(step))
  }
}

const sanitizeStep = (step: ReasoningStep): ReasoningStep => {
  if (isReasoningTextStep(step)) {
    return {
      ...step,
      reasoning: "",
    }
  }

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
      return { type: "code_interpreter", status: "success", stdout: "", stderr: "", durationMs: 0 }
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

const collectNoteToolOutputs = (steps: ReasoningStep[]): Array<CreateNoteOutput | EditNoteOutput> =>
  steps.flatMap((step) => {
    if (!isToolCallStep(step)) return []
    if (
      (step.name === "create_note" || step.name === "edit_note") &&
      typeof step.output !== "string"
    ) {
      return [step.output as CreateNoteOutput | EditNoteOutput]
    }
    return []
  })

const applyRemoteNoteNode = (
  prevNodes: NoteNode[],
  nextNode: NoteNode,
  selectNode: boolean,
): NoteNode[] => {
  const existingNode = prevNodes.find((node) => node.id === nextNode.id)
  const baseNode = existingNode
    ? {
        ...nextNode,
        selected: existingNode.selected,
        dragging: existingNode.dragging,
        measured: existingNode.measured ?? nextNode.measured,
      }
    : nextNode

  if (existingNode) {
    return prevNodes.map((node) =>
      node.id === nextNode.id
        ? {
            ...baseNode,
            selected: selectNode ? true : baseNode.selected,
          }
        : (selectNode ? { ...node, selected: false } : node)
    )
  }

  const maxZ = prevNodes.reduce((acc, node) => {
    const kind = (node.data as { kind?: string }).kind
    const nodeType = (node.data as { style?: { type?: string } }).style?.type
    if (kind === "point" || nodeType === "slide") return acc
    return Math.max(acc, node.zIndex ?? 0)
  }, 0)

  const appendedNode = {
    ...baseNode,
    selected: selectNode,
    zIndex: baseNode.data.style?.type === "slide" ? -1000 : maxZ + 1,
  }

  const clearedNodes = selectNode
    ? prevNodes.map((node) => ({ ...node, selected: false }))
    : prevNodes

  return [...clearedNodes, appendedNode]
}
