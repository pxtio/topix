export const PROVIDERS = [
  "openai",
  "openrouter",
  "gemini",
  "deepseek",
  "mistralai",
  "moonshotai",
  "anthropic",
  "linkup",
  "tavily",
  "perplexity",
] as const

export type Provider = typeof PROVIDERS[number]