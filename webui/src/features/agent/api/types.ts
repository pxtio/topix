import type { Chat } from "../types/chat"
import type { LlmModel } from "../types/llm"
import type { ToolName } from "../types/stream"
import type { WebSearchEngine } from "../types/web"


/**
 * Request payload for sending a message.
 */
export interface SendMessageRequestPayload {
  query: string
  messageId: string
  model: LlmModel
  webSearchEngine: WebSearchEngine
  enabledTools?: ToolName[]
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