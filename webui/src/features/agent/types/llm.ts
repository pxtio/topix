export const LlmModels = [
  "gpt-4",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4.1",
  "gemini-2.0-flash",
  "mistral-large-latest"
] as const

export type LlmModel = typeof LlmModels[number]


export const LlmName: Record<LlmModel, string> = {
    "gpt-4": "GPT-4",
    "gpt-4o": "GPT-4o",
    "gpt-4o-mini": "GPT-4o Mini",
    "gpt-4.1": "GPT-4.1",
    "gemini-2.0-flash": "Gemini 2.0 Flash",
    "mistral-large-latest": "Mistral Large Latest"
}


export const LlmDescription: Record<LlmModel, string> = {
    "gpt-4": 'The latest version of GPT-4, offering improved performance and capabilities.',
    "gpt-4o": 'Great for high-quality, reliable responses with minimal hallucination, making it a solid default choice.',
    "gpt-4o-mini": 'A more affordable option with similar reliability, suitable for less demanding tasks.',
    "gpt-4.1": 'An enhanced version of GPT-4 with better performance and capabilities.',
    "mistral-large-latest": 'Best for those who prefer a French-based AI solution.',
    "gemini-2.0-flash": 'Ideal for cost-effective, factual responses, perfect for concise and straightforward answers.',
};