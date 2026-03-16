import { create } from "zustand"
import type { ToolName } from "../types/stream"
import type { LlmModel } from "../types/llm"
import type { WebSearchEngine } from "../types/web"
import { defaultServices, type Services } from "../types/services"

const DEFAULT_LLM_MODEL: LlmModel = "openai/gpt-5.1-chat-latest"


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
  enableMessageBoardContextSelection: boolean
  services: Services
  setLlmModel: (model: LlmModel) => void
  setWebSearchEngine: (engine: WebSearchEngine) => void
  setEnabledTools: (tools: ToolName[]) => void
  setIsStreaming: (isStreaming: boolean) => void
  setUseDeepResearch: (useDeepResearch: boolean) => void
  setEnableMessageBoardContextSelection: (enabled: boolean) => void
  syncDefaults: (availableServices: Services) => void
}


/**
 * Create a Zustand store for managing chat streams.
 *
 * @returns A Zustand store with methods to add and clear chat streams.
 */
export const useChatStore = create<ChatStore>((set) => ({
  llmModel: DEFAULT_LLM_MODEL,

  webSearchEngine: "linkup",

  enabledTools: [
    "web_search",
    "memory_search",
    "code_interpreter",
    "create_note",
    "edit_note",
    "navigate",
    "image_generation",
    "display_stock_widget",
    "display_weather_widget",
    "display_image_search_widget"
  ],

  isStreaming: false,

  useDeepResearch: false,

  enableMessageBoardContextSelection: true,

  services: defaultServices(),

  setLlmModel: (model) => set({ llmModel: model }),

  setWebSearchEngine: (engine) => set({ webSearchEngine: engine }),

  setEnabledTools: (tools) => set({ enabledTools: tools }),

  setIsStreaming: (isStreaming) => set({ isStreaming }),

  setUseDeepResearch: (useDeepResearch) => set({ useDeepResearch }),

  setEnableMessageBoardContextSelection: (enableMessageBoardContextSelection) => (
    set({ enableMessageBoardContextSelection })
  ),

  syncDefaults: (services: Services) => {
    const defaultLlm = services.llm.find((service) => (
      service.name === DEFAULT_LLM_MODEL && service.available
    ))
    const firstAvailableLlm = services.llm.find((service) => service.available)
    const selectedLlm = defaultLlm ?? firstAvailableLlm

    if (selectedLlm) {
      set({ llmModel: selectedLlm.name })
    }

    const firstAvailableSearch = services.search.find((service) => service.available)
    if (firstAvailableSearch) {
      set({ webSearchEngine: firstAvailableSearch.name as WebSearchEngine })
    }
    // init with default available tools
    const enabledTools: ToolName[] = [
      "memory_search",
      "create_note",
      "edit_note",
      "display_stock_widget",
      "display_weather_widget",
      "display_image_search_widget"
    ]
    if (services.code.filter((service) => service.available).length > 0) {
      enabledTools.push("code_interpreter")
    }
    if (services.navigate.filter((service) => service.available).length > 0) {
      enabledTools.push("navigate")
    }
    if (services.search.filter((service) => service.available).length > 0) {
      enabledTools.push("web_search")
    }
    if (services.imageGeneration.filter((service) => service.available).length > 0) {
      enabledTools.push("image_generation")
    }
    set({ enabledTools })

    set({ services })
  }
}))
