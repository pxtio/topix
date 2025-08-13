import { OpenAI, Gemini, Anthropic } from '@lobehub/icons'


export const LlmModels = [
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "openai/gpt-4.1",
  "openai/gpt-4.1-mini",
  "openai/gpt-4.1-nano",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
  "gemini/gemini-2.0-flash",
  "gemini/gemini-2.5-flash",
  "gemini/gemini-2.5-pro",
  "anthropic/claude-opus-4-1",
  "anthropic/claude-sonnet-4",
  "anthropic/claude-haiku"
] as const

export type LlmModel = typeof LlmModels[number]

export const LlmName: Record<LlmModel, string> = {
  "openai/gpt-4o": "GPT-4o",
  "openai/gpt-4o-mini": "GPT-4o Mini",
  "openai/gpt-4.1": "GPT-4.1",
  "openai/gpt-4.1-mini": "GPT-4.1 Mini",
  "openai/gpt-4.1-nano": "GPT-4.1 Nano",
  "openai/gpt-5": "GPT-5",
  "openai/gpt-5-mini": "GPT-5 Mini",
  "openai/gpt-5-nano": "GPT-5 Nano",
  "gemini/gemini-2.0-flash": "Gemini 2.0 Flash",
  "gemini/gemini-2.5-flash": "Gemini 2.5 Flash",
  "gemini/gemini-2.5-pro": "Gemini 2.5 Pro",
  "anthropic/claude-opus-4-1": "Claude Opus 4.1",
  "anthropic/claude-sonnet-4": "Claude Sonnet 4",
  "anthropic/claude-haiku": "Claude Haiku"
}

export const LlmDescription: Record<LlmModel, string> = {
  "openai/gpt-4o": "High-quality, fast, and capable model with strong reasoning skills and low latency",
  "openai/gpt-4o-mini": "A lighter, more affordable variant of GPT-4o for less intensive tasks",
  "openai/gpt-4.1": "Enhanced GPT-4 model with strong general capabilities",
  "openai/gpt-4.1-mini": "Smaller GPT-4.1 model optimized for cost-effective and fast responses",
  "openai/gpt-4.1-nano": "Ultra-lightweight GPT-4.1 model ideal for very fast, basic tasks",
  "openai/gpt-5": "Next-generation model with advanced capabilities and improved performance",
  "openai/gpt-5-mini": "Compact version of GPT-5 designed for efficiency and speed",
  "openai/gpt-5-nano": "Lightweight GPT-5 model suitable for quick tasks",
  "gemini/gemini-2.0-flash": "Efficient and affordable model ideal for factual, concise answers",
  "gemini/gemini-2.5-flash": "Faster Gemini model offering improved quality over 2.0 Flash",
  "gemini/gemini-2.5-pro": "Flagship Gemini model with high accuracy and rich reasoning capabilities",
  "anthropic/claude-opus-4-1": "Powerful agentic model from Anthropic",
  "anthropic/claude-sonnet-4": "Fast and powerful model from Anthropic",
  "anthropic/claude-haiku": "Lightweight model from Anthropic"
}


export const LlmBrandIcon: Record<LlmModel, React.ComponentType<{ size?: number | string, color?: string }>> = {
  "openai/gpt-4o": OpenAI,
  "openai/gpt-4o-mini": OpenAI,
  "openai/gpt-4.1": OpenAI,
  "openai/gpt-4.1-mini": OpenAI,
  "openai/gpt-4.1-nano": OpenAI,
  "openai/gpt-5": OpenAI,
  "openai/gpt-5-mini": OpenAI,
  "openai/gpt-5-nano": OpenAI,
  "gemini/gemini-2.0-flash": Gemini.Color,
  "gemini/gemini-2.5-flash": Gemini.Color,
  "gemini/gemini-2.5-pro": Gemini.Color,
  "anthropic/claude-opus-4-1": Anthropic,
  "anthropic/claude-sonnet-4": Anthropic,
  "anthropic/claude-haiku": Anthropic
}