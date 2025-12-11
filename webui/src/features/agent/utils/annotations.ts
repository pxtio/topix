import type { AgentResponse, ReasoningStep } from "../types/stream"
import type { ToolOutput, UrlAnnotation } from "../types/tool-outputs"

export const ANNOTATION_CONTENT_LIMIT = 50

export const trimResponseAnnotations = (response: AgentResponse): AgentResponse => ({
  ...response,
  steps: response.steps.map(trimReasoningStep)
})

export const trimReasoningSteps = (steps: ReasoningStep[]): ReasoningStep[] =>
  steps.map(trimReasoningStep)

const trimReasoningStep = (step: ReasoningStep): ReasoningStep => ({
  ...step,
  output: trimToolOutputContent(step.output)
})

export const trimToolOutputContent = (output: ToolOutput): ToolOutput => {
  if (typeof output === "string") {
    return output
  }

  if (output.type === "web_search") {
    return {
      ...output,
      searchResults: output.searchResults.map(trimUrlAnnotationContent)
    }
  }

  return output
}

export const trimUrlAnnotationContent = (annotation: UrlAnnotation): UrlAnnotation => {
  if (!annotation.content) {
    return annotation
  }

  const content = annotation.content.length > ANNOTATION_CONTENT_LIMIT
    ? annotation.content.slice(0, ANNOTATION_CONTENT_LIMIT)
    : annotation.content

  if (content === annotation.content) {
    return annotation
  }

  return {
    ...annotation,
    content
  }
}
