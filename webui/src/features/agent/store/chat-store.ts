import { create } from "zustand"
import type { ToolName } from "../types/stream"
import type { LlmModel } from "../types/llm"
import type { WebSearchEngine } from "../types/web"
import { defaultServices, type Services } from "../types/services"


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
  isStreaming: boolean
  llmModel: LlmModel
  webSearchEngine: WebSearchEngine
  enabledTools: ToolName[]
  useDeepResearch: boolean
  services: Services
  setLlmModel: (model: LlmModel) => void
  setWebSearchEngine: (engine: WebSearchEngine) => void
  setEnabledTools: (tools: ToolName[]) => void
  setIsStreaming: (isStreaming: boolean) => void
  setUseDeepResearch: (useDeepResearch: boolean) => void
  syncDefaults: (availableServices: Services) => void
}


/**
 * Create a Zustand store for managing chat streams.
 *
 * @returns A Zustand store with methods to add and clear chat streams.
 */
export const useChatStore = create<ChatStore>((set) => ({
  llmModel: "openai/gpt-5.1",

  webSearchEngine: "linkup",

  enabledTools: ["web_search", "memory_search", "code_interpreter", "navigate", "display_stock_widget", "display_weather_widget"],

  isStreaming: false,

  useDeepResearch: false,

  services: defaultServices(),

  setLlmModel: (model) => set({ llmModel: model }),

  setWebSearchEngine: (engine) => set({ webSearchEngine: engine }),

  setEnabledTools: (tools) => set({ enabledTools: tools }),

  setIsStreaming: (isStreaming) => set({ isStreaming }),

  setUseDeepResearch: (useDeepResearch) => set({ useDeepResearch }),

  syncDefaults: (services: Services) => {
    const firstAvailableLlm = services.llm.find((service) => service.available)
    if (firstAvailableLlm) {
      set({ llmModel: firstAvailableLlm.name })
    }

    const firstAvailableSearch = services.search.find((service) => service.available)
    if (firstAvailableSearch) {
      set({ webSearchEngine: firstAvailableSearch.name as WebSearchEngine })
    }

    const enabledTools: ToolName[] = ["memory_search", "display_stock_widget", "display_weather_widget"]
    if (services.code.filter((service) => service.available).length > 0) {
      enabledTools.push("code_interpreter")
    }
    if (services.navigate.filter((service) => service.available).length > 0) {
      enabledTools.push("navigate")
    }
    if (services.search.filter((service) => service.available).length > 0) {
      enabledTools.push("web_search")
    }
    set({ enabledTools })

    set({ services })
  }
}))