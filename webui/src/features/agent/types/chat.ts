import type { ReasoningStep } from "./stream"

export type MessageRole = "user" | "assistant" | "system"


export interface ChatMessage {
    id: string
    role: MessageRole
    content: string
    createdAt?: string
    updatedAt?: string
    deletedAt?: string
    chatUid: string
    properties: {
      reasoning?: {
        prop: {
          type: "reasoning",
          reasoning: ReasoningStep[]
        }
      }
    }
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