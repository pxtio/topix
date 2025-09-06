import camelcaseKeys from 'camelcase-keys'

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
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.trim()) {
        yield camelcaseKeys(JSON.parse(line), { deep: true }) as T
      }
    }
  }

  if (buffer.trim()) {
    yield camelcaseKeys(JSON.parse(buffer), { deep: true }) as T
  }
}