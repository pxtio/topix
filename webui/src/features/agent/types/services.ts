import type { LlmModel } from "./llm"

/**
 * Represents a service option with its availability and provider.
 */
export interface ServiceOption {
  name: string
  available: boolean
  provider?: string
}

export interface LlmOption extends ServiceOption {
  name: LlmModel
}


/**
 * Services grouped by category.
 */
export interface Services {
  llm: LlmOption[]
  search: ServiceOption[]
  navigate: ServiceOption[]
  code: ServiceOption[]
  imageGeneration: ServiceOption[]
}

// Constant array of service category names
export const SERVICE_NAMES = ["llm", "search", "navigate", "code", "imageGeneration"] as const

// Type representing the names of the service categories
export type ServiceName = typeof SERVICE_NAMES[number]


/**
 * Default services with their availability status.
 *
 * Note: All services are marked as unavailable by default.
 */
export const defaultServices: () => Services = () => ({
  llm: [
    { name: "openai/gpt-5.2", available: false, provider: "openai" },
    { name: "openai/gpt-5.2-chat", available: false, provider: "openai" },
    { name: "openai/gpt-5.1", available: false, provider: "openai" },
    { name: "openai/gpt-5.1-chat-latest", available: false, provider: "openai" },
    // { name: "openai/gpt-5", available: false, provider: "openai" },
    // { name: "openai/gpt-5-mini", available: false, provider: "openai" },
    // { name: "openai/gpt-5-nano", available: false, provider: "openai" },
    // { name: "openai/gpt-4.1", available: false, provider: "openai" },
    // { name: "openai/gpt-4o", available: false, provider: "openai" },
    { name: "openrouter/anthropic/claude-opus-4.6", available: false, provider: "openrouter" },
    { name: "openrouter/anthropic/claude-opus-4.5", available: false, provider: "openrouter" },
    // { name: "openrouter/anthropic/claude-opus-4.1", available: false, provider: "openrouter" },
    { name: "openrouter/anthropic/claude-sonnet-4.5", available: false, provider: "openrouter" },
    { name: "openrouter/anthropic/claude-haiku-4.5", available: false, provider: "openrouter" },
    { name: "openrouter/google/gemini-3-pro-preview", available: false, provider: "openrouter" },
    { name: "openrouter/google/gemini-2.5-pro", available: false, provider: "openrouter" },
    { name: "openrouter/google/gemini-2.5-flash", available: false, provider: "openrouter" },
    { name: "openrouter/mistralai/mistral-large-2512", available: false, provider: "openrouter" },
    { name: "openrouter/mistralai/mistral-medium-3.1", available: false, provider: "openrouter" },
    { name: "openrouter/deepseek/deepseek-v3.2", available: false, provider: "openrouter" },
    // { name: "openrouter/deepseek/deepseek-chat-v3.1", available: false, provider: "openrouter" },
    { name: "openrouter/moonshotai/kimi-k2-thinking", available: false, provider: "openrouter" },
  ],
  search: [
    { name: "linkup", available: false, provider: "linkup" },
    { name: "exa", available: false, provider: "exa" },
    { name: "perplexity", available: false, provider: "perplexity" },
    { name: "tavily", available: false, provider: "tavily" },
    { name: "openai", available: false, provider: "openai" },
  ],
  navigate: [
    { name: "tavily", available: false, provider: "tavily" },
  ],
  code: [
    { name: "openai", available: false, provider: "openai" },
  ],
  imageGeneration: [
    { name: "openrouter", available: false, provider: "openrouter" },
  ],
})


/**
 * Check if a service option is available.
 *
 * @param option - The name of the service option to check.
 * @param serviceName - The category of the service.
 * @param services - The services object containing availability info.
 * @returns True if the option is available, false otherwise.
 */
export function assertAvailable({
  option, serviceName, services
}: { option: string, serviceName: ServiceName, services: Services }): boolean {
  return services[serviceName].some((service) => service.name === option && service.available)
}