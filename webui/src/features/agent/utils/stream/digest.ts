/**
 * Handle streaming response from the AI assistant.
 *
 * @param response - The response object from the fetch request.
 * @param messageHandler - Callback function to handle each streamed message.
 * @param errorHandler - Callback function to handle errors during message parsing.
 *
 * @throws Will throw an error if the ReadableStream is not supported in the browser.
 */
export async function* handleStreamingResponse<T>(response: Response): AsyncGenerator<T>{
  if (!response.body) {
    throw new Error("ReadableStream not supported in this browser.")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    while (true) {
      const newlineIndex = buffer.indexOf('\n')
      if (newlineIndex === -1) break
      const line = buffer.slice(0, newlineIndex)
      buffer = buffer.slice(newlineIndex + 1)
      if (line.trim()) {
        yield JSON.parse(line) as T
      }
    }
  }

  if (buffer.trim()) {
    yield JSON.parse(buffer) as T
  }
}
