export type MessageRole = "user" | "assistant" | "system" | "tool"


export interface ChatMessage {
    id: string
    role: MessageRole
    content: string
    createdAt?: string
    updatedAt?: string
    deletedAt?: string
    chatUid: string
}


export interface Chat {
    id: number
    uid: string
    label?: string
    userUid?: string
    graphUid?: string
    createdAt?: string
    updatedAt?: string
    deletedAt?: string
}