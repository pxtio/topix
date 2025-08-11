import { create } from "zustand"
import type { AgentResponse } from "../types/stream"
import type { LlmModel } from "../types/llm"
import type { WebSearchEngine } from "../types/web"


/**
 * Store for managing chat streams.
 *
 * @property streams - A map of chat IDs to their respective stream messages.
 * @property isStreaming - A boolean indicating if a message is currently being streamed.
 * @property setIsStreaming - Function to set the streaming state.
 * @property setStream - Function to set the stream for a specific chat.
 * @property clearStream - Function to clear the stream for a specific chat.
 */
export interface ChatStore {
  streams: Map<string, AgentResponse>
  isStreaming: boolean
  streamingMessageId?: string
  currentChatId?: string
  llmModel: LlmModel
  webSearchEngine: WebSearchEngine
  setLlmModel: (model: LlmModel) => void
  setWebSearchEngine: (engine: WebSearchEngine) => void
  setIsStreaming: (isStreaming: boolean) => void
  setStreamingMessageId: (messageId?: string) => void
  setCurrentChatId: (chatId?: string) => void
  setStream: (responseId: string, response: AgentResponse) => void
  clearStream: (responseId: string) => void
}


/**
 * Create a Zustand store for managing chat streams.
 *
 * @returns A Zustand store with methods to add and clear chat streams.
 */
export const useChatStore = create<ChatStore>((set) => ({
  streams: new Map(),

  llmModel: "openai/gpt-4.1",

  webSearchEngine: "openai",

  isStreaming: false,

  streamingMessageId: undefined,

  currentChatId: undefined,

  setLlmModel: (model) => set({ llmModel: model }),

  setWebSearchEngine: (engine) => set({ webSearchEngine: engine }),

  setIsStreaming: (isStreaming) => set({ isStreaming }),

  setStreamingMessageId: (messageId) => set({ streamingMessageId: messageId }),

  setCurrentChatId: (chatId) => set({ currentChatId: chatId }),

  setStream: (responseId, response) => set((state) => {
    return { streams: new Map(state.streams).set(responseId, response) }
  }),

  clearStream: (responseId) => set((state) => {
    const streams = new Map(state.streams)
    streams.delete(responseId)
    return { streams }
  })
}))