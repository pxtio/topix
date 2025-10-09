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
  "openai/gpt-4o": "High-quality, fast, and capable model with strong reasoning skills and low latency",
  "openai/gpt-4.1": "Enhanced GPT-4 model with strong general capabilities",
  "openai/gpt-5": "Next-generation model with advanced capabilities and improved performance",
  "openai/gpt-5-mini": "Compact version of GPT-5 designed for efficiency and speed",
  "openai/gpt-5-nano": "Lightweight GPT-5 model suitable for quick tasks",
  "gemini/gemini-2.5-flash": "Faster Gemini model offering improved quality over 2.0 Flash",
  "gemini/gemini-2.5-pro": "Flagship Gemini model with high accuracy and rich reasoning capabilities",
  "openrouter/anthropic/claude-opus-4.1": "Powerful agentic model from Anthropic",
  "openrouter/anthropic/claude-sonnet-4.5": "Fast and powerful model from Anthropic",
  "openrouter/anthropic/claude-3.5-haiku": "Lightweight model from Anthropic",
  "openrouter/mistralai/mistral-medium-3.1": "Powerful french model from Mistral",
  "openrouter/deepseek/deepseek-chat-v3.1": "Stronger opensource model from DeepSeek"
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
  "openrouter/mistralai/mistral-medium-3.1": Mistral,
  "openrouter/deepseek/deepseek-chat-v3.1": DeepSeek
}