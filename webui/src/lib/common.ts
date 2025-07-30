/**
 * Generates a UUID without dashes.
 */
export function generateUuid(): string {
  return crypto.randomUUID().replace(/-/g, '')
}


/**
 * Trims a string to a specified maximum length and appends an ellipsis if trimmed.
 *
 * @param text - The string to be trimmed.
 * @param maxLength - The maximum length of the string.
 * @returns The trimmed string with an ellipsis if it exceeds the maximum length.
 */
export const trimText = (text: string, maxLength: number) => {
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + '...'
  }
  return text
}