export const LlmModels = [
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "openai/gpt-4.1",
  "openai/gpt-4.1-mini",
  "openai/gpt-4.1-nano",
  "gemini/gemini-2.0-flash",
  "gemini/gemini-2.5-flash",
  "gemini/gemini-2.5-pro"
] as const

export type LlmModel = typeof LlmModels[number]

export const LlmName: Record<LlmModel, string> = {
  "openai/gpt-4o": "GPT-4o",
  "openai/gpt-4o-mini": "GPT-4o Mini",
  "openai/gpt-4.1": "GPT-4.1",
  "openai/gpt-4.1-mini": "GPT-4.1 Mini",
  "openai/gpt-4.1-nano": "GPT-4.1 Nano",
  "gemini/gemini-2.0-flash": "Gemini 2.0 Flash",
  "gemini/gemini-2.5-flash": "Gemini 2.5 Flash",
  "gemini/gemini-2.5-pro": "Gemini 2.5 Pro"
}

export const LlmDescription: Record<LlmModel, string> = {
  "openai/gpt-4o": "High-quality, fast, and capable model with strong reasoning skills and low latency",
  "openai/gpt-4o-mini": "A lighter, more affordable variant of GPT-4o for less intensive tasks",
  "openai/gpt-4.1": "Enhanced GPT-4 model with strong general capabilities",
  "openai/gpt-4.1-mini": "Smaller GPT-4.1 model optimized for cost-effective and fast responses",
  "openai/gpt-4.1-nano": "Ultra-lightweight GPT-4.1 model ideal for very fast, basic tasks",
  "gemini/gemini-2.0-flash": "Efficient and affordable model ideal for factual, concise answers",
  "gemini/gemini-2.5-flash": "Faster Gemini model offering improved quality over 2.0 Flash",
  "gemini/gemini-2.5-pro": "Flagship Gemini model with high accuracy and rich reasoning capabilities"
}