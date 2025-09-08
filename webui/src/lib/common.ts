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


/**
 * Pauses execution for a specified number of milliseconds.
 *
 * @param ms - The number of milliseconds to sleep.
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))


/**
 * Converts a UUID string to a numeric hash.
 *
 * @param uuid - The UUID string to convert.
 * @returns A numeric hash derived from the UUID.
 */
export function uuidToNumber(uuid: string): number {
  let hash = 0
  for (let i = 0; i < uuid.length; i++) {
    const code = uuid.charCodeAt(i)
    // mix the bits
    hash = (hash * 31 + code) >>> 0 // keep as unsigned 32-bit
  }
  return hash
}