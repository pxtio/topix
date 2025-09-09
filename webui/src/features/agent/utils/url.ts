import { getDomain } from 'tldts'
import type { AgentResponse } from '../types/stream'
import type { UrlAnnotation, WebSearchOutput } from '../types/tool-outputs'

/**
 * Extracts the main domain from a URL or hostname.
 * Returns null for invalid or non-domain inputs (e.g. IPs, localhost).
 */
export function extractMainDomain(input: string): string | null {
  return getDomain(input, { allowPrivateDomains: true }) ?? null
}

// Extract URLs from agent response steps
export function extractAnswerWebSources(answer: AgentResponse): UrlAnnotation[] {
  const sources: UrlAnnotation[] = []
  for (const step of answer.steps) {
    if (step.name === "web_search") {
      const output = step.output as WebSearchOutput
      output.searchResults.forEach(result => {
        const exist = sources.find(s => s.url === result.url)
        if (!exist) {
          sources.push(result)
        }
      })
    }
  }
  return sources
}