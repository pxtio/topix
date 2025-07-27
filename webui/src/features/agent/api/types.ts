import type { Chat } from "../types/chat"


/**
 * Request payload for sending a message.
 */
export interface SendMessageRequestPayload {
    query: string
}


/**
 * Response type for sending a message.
 */
export interface VoidSuccessResponse {
    success: boolean
}


/**
 * Response type for listing chats.
 */
export interface ListChatsResponse extends VoidSuccessResponse {
    data: {
        chats: Chat[]
    }
}