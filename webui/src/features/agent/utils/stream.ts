import camelcaseKeys from 'camelcase-keys'
import { RAW_MESSAGE, type AgentResponse, type AgentStreamMessage, type ReasoningStep } from '../types/stream'
import { extractNamedLinksFromMarkdown } from './md'


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


/**
 * Constructs a full response from the streamed chunks.
 *
 * @param chunks - An async generator yielding AgentStreamMessage objects.
 *
 * @returns An async generator yielding AgentResponse objects.
 */
export async function* buildResponse(
  chunks: AsyncGenerator<AgentStreamMessage>
): AsyncGenerator<{ response: AgentResponse; finished: boolean }> {
  // Initialize an empty response object
  const response: AgentResponse = { steps: [] }

  // Iterate over each chunk from the async generator
  for await (const chunk of chunks) {
    // Filter steps to find the one matching the toolId
    const steps = response.steps.filter(step => step.id === chunk.toolId)

    // If no step exists for the current toolId or if the reasoning continues after a tool call
    // (marked by last tool name not being RAW_MESSAGE and current tool name being RAW_MESSAGE),
    if (
      steps.length === 0 ||
      (response.steps[response.steps.length - 1].name !== "raw_message" && chunk.toolName === "raw_message" && !chunk.isStop)
    ) {
      const newStep: ReasoningStep = {
        id: chunk.toolId,
        name: chunk.toolName,
        response: "",
        state: "started",
        eventMessages: []
      }
      if (chunk.content) {
        if (chunk.content.type === "token" || chunk.content.type === "message") {
          newStep.response = chunk.content.text
        } else if (chunk.content.type === "status") {
          newStep.eventMessages.push(chunk.content.text)
        }
      }
      if (chunk.isStop) {
        newStep.state = "completed"
      }
      response.steps.push(newStep)

      // mark all previous steps of same id as completed
      steps.forEach((step, idx) => {
        if (idx < steps.length - 1) {
          step.state = "completed"
        }
      })
    } else {
      // If a step with the same toolId exists, update it
      const currentStep = steps[steps.length - 1]

      if (chunk.content) {
        if (chunk.content.type === "token" || chunk.content.type === "message") {
          currentStep.response = (currentStep.response || "") + chunk.content.text
        } else if (chunk.content.type === "status") {
          currentStep.eventMessages.push(chunk.content.text)
        }
      }

      if (chunk.isStop) {
        currentStep.state = "completed"
        if (currentStep.name === "web_search") {
          const links = extractNamedLinksFromMarkdown(currentStep.response || "")
          currentStep.sources = links.map(link => ({
            type: "webpage",
            webpage: {
              name: link.siteName,
              url: link.url
            }
          }))
        }
      }
    }
    yield { response: { ...response }, finished: false }
  }
  response.steps.forEach(step => {
    step.state = "completed"
  })
  yield { response, finished: true }
}


/**
 * Extracts the description from a ReasoningStep.
 *
 * @param step - The ReasoningStep from which to extract the description.
 * @returns The description of the step, or an empty string if not available.
 */
export function extractStepDescription(step: ReasoningStep): string {
  if (step.name !== RAW_MESSAGE) {
    if (step.eventMessages && step.eventMessages.length > 0) {
      return step.eventMessages[step.eventMessages.length - 1]
    }
    return `Running \`${step.name}\``
  }
  return step.response || "Reasoning..."
}