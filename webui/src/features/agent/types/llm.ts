import { OpenAI, Gemini, Anthropic, DeepSeek, Mistral, Moonshot } from '@lobehub/icons'

export const LlmModels = [
  "openai/gpt-5.1",
  "openai/gpt-5.1-chat-latest",
  "openai/gpt-4o",
  "openai/gpt-4.1",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
  "openrouter/anthropic/claude-opus-4.1",
  "openrouter/anthropic/claude-sonnet-4.5",
  "openrouter/anthropic/claude-haiku-4.5",
  "openrouter/google/gemini-3-pro-preview",
  "openrouter/google/gemini-2.5-pro",
  "openrouter/google/gemini-2.5-flash",
  "openrouter/mistralai/mistral-medium-3.1",
  "openrouter/deepseek/deepseek-chat-v3.1",
  "openrouter/moonshotai/kimi-k2-thinking"
] as const

export type LlmModel = typeof LlmModels[number]

export const LlmName: Record<LlmModel, string> = {
  "openai/gpt-5.1-chat-latest": "GPT-5.1 Chat",
  "openai/gpt-5.1": "GPT-5.1",
  "openai/gpt-4o": "GPT-4o",
  "openai/gpt-4.1": "GPT-4.1",
  "openai/gpt-5": "GPT-5",
  "openai/gpt-5-mini": "GPT-5 Mini",
  "openai/gpt-5-nano": "GPT-5 Nano",
  "openrouter/google/gemini-3-pro-preview": "Gemini 3 Pro Preview",
  "openrouter/google/gemini-2.5-pro": "Gemini 2.5 Pro",
  "openrouter/google/gemini-2.5-flash": "Gemini 2.5 Flash",
  "openrouter/anthropic/claude-opus-4.1": "Claude Opus 4.1",
  "openrouter/anthropic/claude-sonnet-4.5": "Claude Sonnet 4.5",
  "openrouter/anthropic/claude-haiku-4.5": "Claude Haiku 4.5",
  "openrouter/mistralai/mistral-medium-3.1": "Mistral Medium",
  "openrouter/deepseek/deepseek-chat-v3.1": "DeepSeek Chat",
  "openrouter/moonshotai/kimi-k2-thinking": "Kimi K2 Thinking"
}

export const LlmDescription: Record<LlmModel, string> = {
  "openai/gpt-5.1": "Next-generation model offering advanced reasoning and broader skill coverage",
  "openai/gpt-5.1-chat-latest": "Latest GPT-5.1 model optimized for chat applications with enhanced capabilities",
  "openai/gpt-4o": "High-quality, fast, and capable model with strong reasoning and low latency",
  "openai/gpt-4.1": "Enhanced GPT-4 model with balanced performance across reasoning and creativity",
  "openai/gpt-5": "Next-generation model offering advanced reasoning and broader skill coverage",
  "openai/gpt-5-mini": "Compact GPT-5 version optimized for efficiency and responsiveness",
  "openai/gpt-5-nano": "Ultra-light GPT-5 variant ideal for quick or edge tasks",
  "openrouter/google/gemini-3-pro-preview": "Cutting-edge Gemini model with advanced reasoning and multimodal capabilities",
  "openrouter/google/gemini-2.5-pro": "Powerful Gemini model designed for professional applications with enhanced understanding",
  "openrouter/google/gemini-2.5-flash": "Lightweight Gemini variant optimized for speed and efficiency",
  "openrouter/anthropic/claude-opus-4.1": "Top-tier Claude model known for its long-context reasoning and safety alignment",
  "openrouter/anthropic/claude-sonnet-4.5": "Balanced Claude model combining speed with nuanced understanding",
  "openrouter/anthropic/claude-haiku-4.5": "Lightweight and responsive Claude variant suited for everyday tasks",
  "openrouter/mistralai/mistral-medium-3.1": "Efficient Mistral model offering strong multilingual and structured reasoning",
  "openrouter/deepseek/deepseek-chat-v3.1": "High-performance open-source model with advanced reasoning and adaptability",
  "openrouter/moonshotai/kimi-k2-thinking": "Innovative model focused on creative problem-solving and dynamic thinking"
}


export const LlmBrandIcon: Record<LlmModel, React.ComponentType<{ size?: number | string, color?: string }>> = {
  "openai/gpt-5.1-chat-latest": OpenAI,
  "openai/gpt-5.1": OpenAI,
  "openai/gpt-4o": OpenAI,
  "openai/gpt-4.1": OpenAI,
  "openai/gpt-5": OpenAI,
  "openai/gpt-5-mini": OpenAI,
  "openai/gpt-5-nano": OpenAI,
  "openrouter/google/gemini-3-pro-preview": Gemini.Color,
  "openrouter/google/gemini-2.5-pro": Gemini.Color,
  "openrouter/google/gemini-2.5-flash": Gemini.Color,
  "openrouter/anthropic/claude-opus-4.1": Anthropic,
  "openrouter/anthropic/claude-sonnet-4.5": Anthropic,
  "openrouter/anthropic/claude-haiku-4.5": Anthropic,
  "openrouter/mistralai/mistral-medium-3.1": Mistral.Color,
  "openrouter/deepseek/deepseek-chat-v3.1": DeepSeek.Color,
  "openrouter/moonshotai/kimi-k2-thinking": Moonshot
}


export const LlmTiers = ["Rapid", "Balanced", "Elite"] as const
export type LlmTier = typeof LlmTiers[number]


export const LlmBadge: Record<LlmModel, LlmTier> = {
  "openai/gpt-5.1-chat-latest": "Elite",
  "openai/gpt-5.1": "Elite",
  "openai/gpt-4o": "Balanced",
  "openai/gpt-4.1": "Balanced",
  "openai/gpt-5": "Elite",
  "openai/gpt-5-mini": "Rapid",
  "openai/gpt-5-nano": "Rapid",
  "openrouter/google/gemini-3-pro-preview": "Elite",
  "openrouter/google/gemini-2.5-pro": "Elite",
  "openrouter/google/gemini-2.5-flash": "Rapid",
  "openrouter/anthropic/claude-opus-4.1": "Elite",
  "openrouter/anthropic/claude-sonnet-4.5": "Balanced",
  "openrouter/anthropic/claude-haiku-4.5": "Rapid",
  "openrouter/mistralai/mistral-medium-3.1": "Balanced",
  "openrouter/deepseek/deepseek-chat-v3.1": "Balanced",
  "openrouter/moonshotai/kimi-k2-thinking": "Balanced"
}

export const LlmFamilies = [
  "openai",
  "google",
  "anthropic",
  "mistralai",
  "deepseek",
  "moonshotai"
]

export type LlmFamily = typeof LlmFamilies[number]

export const LlmFamilyMap: Record<LlmModel, LlmFamily> = {
  "openai/gpt-5.1-chat-latest": "openai",
  "openai/gpt-5.1": "openai",
  "openai/gpt-4o": "openai",
  "openai/gpt-4.1": "openai",
  "openai/gpt-5": "openai",
  "openai/gpt-5-mini": "openai",
  "openai/gpt-5-nano": "openai",
  "openrouter/google/gemini-3-pro-preview": "google",
  "openrouter/google/gemini-2.5-pro": "google",
  "openrouter/google/gemini-2.5-flash": "google",
  "openrouter/anthropic/claude-opus-4.1": "anthropic",
  "openrouter/anthropic/claude-sonnet-4.5": "anthropic",
  "openrouter/anthropic/claude-haiku-4.5": "anthropic",
  "openrouter/mistralai/mistral-medium-3.1": "mistralai",
  "openrouter/deepseek/deepseek-chat-v3.1": "deepseek",
  "openrouter/moonshotai/kimi-k2-thinking": "moonshotai"
}


export const LlmFamilyIcon: Record<LlmFamily, React.ComponentType<{ size?: number | string, color?: string }>> = {
  openai: OpenAI,
  google: Gemini.Color,
  anthropic: Anthropic,
  mistralai: Mistral.Color,
  deepseek: DeepSeek.Color,
  moonshotai: Moonshot
}