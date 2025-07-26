import { API_URL } from "@/config/api";
import type { AgentStreamMessage } from "../types/stream";
import type { SendMessageRequestPayload } from "./types";
import { handleStreamingResponse } from "../utils/stream";


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