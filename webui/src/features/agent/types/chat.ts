import type { ReasoningStep } from "./stream"

export type MessageRole = "user" | "assistant" | "system"

/**
 * ChatMessage represents a message in a chat conversation.
 */
export interface ChatMessage {
  id: string
  role: MessageRole
  content: {
    markdown: string
  }
  createdAt?: string
  updatedAt?: string
  deletedAt?: string
  chatUid: string
  properties: {
    reasoning?: {
      type: "reasoning",
      reasoning: ReasoningStep[]
    }
  }
  streaming?: boolean
  isDeepResearch?: boolean
  sentAt?: string
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