import type { Chat } from "../types/chat"

export interface SendMessageRequestPayload {
    query: string
}


export interface VoidSuccessResponse {
    success: boolean
}


export interface ListChatsResponse extends VoidSuccessResponse {
    data: {
        chats: Chat[]
    }
}