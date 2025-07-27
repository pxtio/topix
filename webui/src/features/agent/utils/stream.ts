import camelcaseKeys from 'camelcase-keys';
import { RAW_RESPONSE, type AgentResponse, type AgentStreamMessage, type ReasoningStep } from '../types/stream';


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
    throw new Error("ReadableStream not supported in this browser.");
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
        yield camelcaseKeys(JSON.parse(line)) as T
      }
    }
  }

  if (buffer.trim()) {
    yield camelcaseKeys(JSON.parse(buffer), { deep: true }) as T
  }
}


/**
 * Constructs a full response from the streamed chunks.
 *
 * @param chunks - An async generator yielding AgentStreamMessage objects.
 *
 * @returns An async generator yielding AgentResponse objects.
 */
export async function* buildResponse(
  chunks: AsyncGenerator<AgentStreamMessage>
): AsyncGenerator<AgentResponse> {
  // Initialize an empty response object
  const response: AgentResponse = { steps: [] }

  // Iterate over each chunk from the async generator
  for await (const chunk of chunks) {

    // Filter steps to find the one matching the toolId
    const newResponse = { ...response }
    const steps = newResponse.steps.filter(step => step.id === chunk.toolId)

    // If no step exists for the current toolId or if the reasoning continues after a tool call
    // (marked by last tool name not being RAW_RESPONSE and current tool name being RAW_RESPONSE),
    if (steps.length === 0 || (steps[steps.length - 1].name !== RAW_RESPONSE && chunk.toolName === RAW_RESPONSE)) {
      const newStep: ReasoningStep = {
        id: chunk.toolId,
        name: chunk.toolName,
        content: chunk.delta?.content || "",
        state: chunk.executionState || "started",
        message: chunk.statusMessage || ""
      }
      newResponse.steps.push(newStep)

      // mark all previous steps of same id as completed
      steps.forEach((step, idx) => {
        if (idx < steps.length - 1) {
          step.state = "completed"
        }
      })
    } else {
      // If a step with the same toolId exists, update it
      const currentStep = steps[steps.length - 1]

      currentStep.content = (currentStep.content || "") + (chunk.delta?.content || "")
      if (chunk.executionState) {
        currentStep.state = chunk.executionState
      }
      if (chunk.statusMessage) {
        currentStep.message = chunk.statusMessage
      }
    }
    yield newResponse;
  }
}