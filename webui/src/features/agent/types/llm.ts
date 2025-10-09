import { OpenAI, Gemini, Anthropic, DeepSeek, Mistral } from '@lobehub/icons'


export const LlmModels = [
  "openai/gpt-4o",
  "openai/gpt-4.1",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
  "gemini/gemini-2.5-flash",
  "gemini/gemini-2.5-pro",
  "openrouter/anthropic/claude-opus-4.1",
  "openrouter/anthropic/claude-sonnet-4.5",
  "openrouter/anthropic/claude-3.5-haiku",
  "openrouter/mistralai/mistral-medium-3.1",
  "openrouter/deepseek/deepseek-chat-v3.1"
] as const

export type LlmModel = typeof LlmModels[number]

export const LlmName: Record<LlmModel, string> = {
  "openai/gpt-4o": "GPT-4o",
  "openai/gpt-4.1": "GPT-4.1",
  "openai/gpt-5": "GPT-5",
  "openai/gpt-5-mini": "GPT-5 Mini",
  "openai/gpt-5-nano": "GPT-5 Nano",
  "gemini/gemini-2.5-flash": "Gemini 2.5 Flash",
  "gemini/gemini-2.5-pro": "Gemini 2.5 Pro",
  "openrouter/anthropic/claude-opus-4.1": "Claude Opus 4.1",
  "openrouter/anthropic/claude-sonnet-4.5": "Claude Sonnet 4",
  "openrouter/anthropic/claude-3.5-haiku": "Claude Haiku",
  "openrouter/mistralai/mistral-medium-3.1": "Mistral Medium",
  "openrouter/deepseek/deepseek-chat-v3.1": "DeepSeek Chat"
}

export const LlmDescription: Record<LlmModel, string> = {
  "openai/gpt-4o": "High-quality, fast, and capable model with strong reasoning and low latency",
  "openai/gpt-4.1": "Enhanced GPT-4 model with balanced performance across reasoning and creativity",
  "openai/gpt-5": "Next-generation model offering advanced reasoning and broader skill coverage",
  "openai/gpt-5-mini": "Compact GPT-5 version optimized for efficiency and responsiveness",
  "openai/gpt-5-nano": "Ultra-light GPT-5 variant ideal for quick or edge tasks",
  "gemini/gemini-2.5-flash": "Optimized Gemini model delivering strong quality with near-instant responses",
  "gemini/gemini-2.5-pro": "Advanced Gemini flagship offering deep reasoning and multimodal capabilities",
  "openrouter/anthropic/claude-opus-4.1": "Top-tier Claude model known for its long-context reasoning and safety alignment",
  "openrouter/anthropic/claude-sonnet-4.5": "Balanced Claude model combining speed with nuanced understanding",
  "openrouter/anthropic/claude-3.5-haiku": "Lightweight and responsive Claude variant suited for everyday tasks",
  "openrouter/mistralai/mistral-medium-3.1": "Efficient Mistral model offering strong multilingual and structured reasoning",
  "openrouter/deepseek/deepseek-chat-v3.1": "High-performance open-source model with advanced reasoning and adaptability"
}


export const LlmBrandIcon: Record<LlmModel, React.ComponentType<{ size?: number | string, color?: string }>> = {
  "openai/gpt-4o": OpenAI,
  "openai/gpt-4.1": OpenAI,
  "openai/gpt-5": OpenAI,
  "openai/gpt-5-mini": OpenAI,
  "openai/gpt-5-nano": OpenAI,
  "gemini/gemini-2.5-flash": Gemini.Color,
  "gemini/gemini-2.5-pro": Gemini.Color,
  "openrouter/anthropic/claude-opus-4.1": Anthropic,
  "openrouter/anthropic/claude-sonnet-4.5": Anthropic,
  "openrouter/anthropic/claude-3.5-haiku": Anthropic,
  "openrouter/mistralai/mistral-medium-3.1": Mistral.Color,
  "openrouter/deepseek/deepseek-chat-v3.1": DeepSeek.Color
}