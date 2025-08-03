/**
 * Utility functions for extracting URLs from Markdown content.
 *
 * @param markdown - The Markdown content to extract URLs from.
 * @returns An array of unique URLs found in the Markdown content.
 */
export function extractUrlsFromMarkdown(markdown: string): string[] {
  const urlRegex = /\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
  const imageRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
  const rawUrlRegex = /(?<!\]\()(?<!!\]\()(https?:\/\/[^\s)]+)/g;

  const urls = new Set<string>();

  // Extract from regular markdown links [text](url)
  let match;
  while ((match = urlRegex.exec(markdown)) !== null) {
    urls.add(match[1]);
  }

  // Extract from images ![alt](url)
  while ((match = imageRegex.exec(markdown)) !== null) {
    urls.add(match[1]);
  }

  // Extract raw URLs not wrapped in markdown syntax
  while ((match = rawUrlRegex.exec(markdown)) !== null) {
    urls.add(match[1]);
  }

  return Array.from(urls);
}