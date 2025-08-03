/**
 * Extracts URLs from a markdown string.
 */
export function extractNamedLinksFromMarkdown(markdown: string): { siteName: string, url: string }[] {
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g
  const results: { siteName: string, url: string }[] = []

  let match
  while ((match = linkRegex.exec(markdown)) !== null) {
    const siteName = match[1].trim()
    const url = match[2].trim()
    results.push({ siteName, url })
  }

  return results
}