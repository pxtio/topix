import { Exa, OpenAI, Perplexity, Tavily } from "@lobehub/icons"

/**
 * Link preview interface for web pages.
 */
export interface LinkPreview {
  title?: string
  description?: string
  image?: string
  siteName?: string
  favicon?: string
}


/**
 * Web search engine options.
 */
export const WebSearchEngines = ["openai", "perplexity", "tavily", "linkup", "exa"] as const
export type WebSearchEngine = typeof WebSearchEngines[number]


export const WebSearchEngineName: Record<WebSearchEngine, string> = {
  openai: "OpenAI",
  perplexity: "Perplexity",
  tavily: "Tavily",
  linkup: "Linkup",
  exa: "Exa"
}


export const WebSearchEngineDescription: Record<WebSearchEngine, string> = {
  openai: "OpenAI's web search",
  perplexity: "Perplexity's web search pipeline",
  tavily: "Tavily's search engine + LLM synthesis",
  linkup: "Linkup's search engine + LLM synthesis",
  exa: "Exa's search engine + LLM synthesis"
}


export const WebSearchEngineIcons: Record<WebSearchEngine, React.ComponentType<{ size?: number | string, color?: string }> | null> = {
  openai: OpenAI,
  perplexity: Perplexity.Color,
  tavily: Tavily.Color,
  linkup: null,
  exa: Exa.Color,
}