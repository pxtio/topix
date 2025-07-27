import { API_URL } from "@/config/api"
import type { AgentStreamMessage } from "../types/stream"
import type { SendMessageRequestPayload } from "./types"
import { buildResponse, handleStreamingResponse } from "../utils/stream"
import { useChatStore } from "../store/chat-store"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import type { ChatMessage } from "../types/chat"
import { generateUuid } from "@/lib/common"


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
    chatId: string
): AsyncGenerator<AgentStreamMessage> {
    const headers = new Headers()
    headers.set("Content-Type", "application/json")

    const response = await fetch(`${API_URL}/chats/${chatId}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
    })

    yield* handleStreamingResponse<AgentStreamMessage>(response)
}


/**
 * Custom hook to send a message to the AI assistant.
 *
 * @returns An object containing the sendMessage function and its state.
 */
export const useSendMessage = () => {
    const setStream = useChatStore((state) => state.setStream)

    const queryClient = useQueryClient()

    const [isStreaming, setIsStreaming] = useState(false)

    const mutation = useMutation({
        mutationFn: async ({
            payload,
            chatId
        }: {
            payload: SendMessageRequestPayload,
            chatId: string
        }) => {
            setIsStreaming(true)
            // Optimistically update the chat messages in the query cache
            try {
                queryClient.setQueryData<ChatMessage[]>(
                    ["listMessages", chatId],
                    (oldMessages) => [
                        ...(oldMessages || []),
                        { id: generateUuid(), role: "user", content: payload.query, chatUid: chatId }
                    ]
                )
                const stream = sendMessage(payload, chatId)
                const response = buildResponse(stream)
                for await (const resp of response) {
                    if (resp.steps.length === 0) continue
                    const step = resp.steps[0]
                    const responseId = step.id
                    setStream(responseId, resp)
                }
            } finally {
                setIsStreaming(false)
            }
        }
    })
    return {
        sendMessage: mutation.mutate,
        isStreaming,
        ...mutation
    }
}