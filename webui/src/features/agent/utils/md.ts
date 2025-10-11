/**
 * Extracts URLs from a markdown string.
 */
export function extractNamedLinksFromMarkdown(markdown: string): { siteName: string, url: string }[] {
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g
  const results: { siteName: string, url: string }[] = []
  const seen = new Set<string>()

  let match
  while ((match = linkRegex.exec(markdown)) !== null) {
    const siteName = match[1].trim()
    const url = match[2].trim()
    if (!seen.has(url)) {
      results.push({ siteName, url })
      seen.add(url)
    }
  }

  return results
}


/**
 * Convert a markdown string to plain text, preserving line breaks.
 */
export function stripMarkdown(text: string): string {
  return text
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]*`/g, '')
    // Remove images
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Remove links but keep the link text
    .replace(/\[([^\]]+)\]\((.*?)\)/g, '$1')
    // Remove bold/italic markers
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove headings
    .replace(/^#{1,6}\s*/gm, '')
    // Remove blockquotes
    .replace(/^>\s?/gm, '')
    // Remove horizontal rules
    .replace(/^-{3,}$/gm, '')
    // Remove unordered list markers
    .replace(/^(\s*[-+*]\s+)/gm, '')
    // Remove ordered list markers
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim()
}