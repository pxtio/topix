import type {
  AgentStreamMessage,
  AgentResponse,
  ReasoningStep,
  ToolExecutionState,
  ToolName,
} from "../../types/stream"
import { RAW_MESSAGE, isMainResponse } from "../../types/stream"
import type {
  WebSearchOutput,
  MemorySearchOutput,
  CodeInterpreterOutput,
  ToolOutput,
  Annotation,
  UrlAnnotation
} from "../../types/tool-outputs"

type BlockKind = "raw" | "tools" | null

type StepAccum = {
  id: string
  name: ToolName
  thoughtText: string
  outputText: string
  state: ToolExecutionState
  eventMessages: string[]
  annotations: Annotation[]
  executedCode?: string
}

const makeToolOutput = (acc: StepAccum): ToolOutput => {
  if (acc.name === "web_search") {
    const urls = acc.annotations.filter(a => a.type === "url") as WebSearchOutput["searchResults"]
    return { type: "web_search", answer: acc.outputText, searchResults: urls }
  }

  if (acc.name === "memory_search") {
    const refs = acc.annotations.filter(a => a.type === "reference") as MemorySearchOutput["references"]
    return { type: "memory_search", answer: acc.outputText, references: refs }
  }

  if (acc.name === "code_interpreter") {
    const files = acc.annotations.filter(a => a.type === "file") as CodeInterpreterOutput["annotations"]
    return {
      type: "code_interpreter",
      answer: acc.outputText,
      executedCode: acc.executedCode ?? "",
      annotations: files
    }
  }

  return acc.outputText
}

export async function* buildResponse(
  chunks: AsyncGenerator<AgentStreamMessage>
): AsyncGenerator<AgentResponse> {
  const stepsById = new Map<string, StepAccum>()
  const order: string[] = []

  let currentBlock: BlockKind = null

  const ensureStep = (toolId: string, toolName: ToolName) => {
    let step = stepsById.get(toolId)
    if (!step) {
      step = {
        id: toolId,
        name: toolName,
        thoughtText: "",
        outputText: "",
        state: "started",
        eventMessages: [],
        annotations: []
      }
      stepsById.set(toolId, step)
      order.push(toolId)
    } else {
      step.name = toolName
    }
    return step
  }

  const completeAll = () => {
    for (const id of order) {
      const s = stepsById.get(id)!
      if (s.state !== "failed") s.state = "completed"
    }
  }

  const completeLastRawIfAny = () => {
    for (let i = order.length - 1; i >= 0; i--) {
      const s = stepsById.get(order[i])!
      if (s.name === RAW_MESSAGE || isMainResponse(s.name)) {
        if (s.state !== "failed") s.state = "completed"
        break
      }
    }
  }

  const toReasoningStep = (acc: StepAccum): ReasoningStep => ({
    id: acc.id,
    name: acc.name,
    thought: acc.thoughtText,
    output: makeToolOutput(acc),
    state: acc.state,
    eventMessages: acc.eventMessages
  })

  for await (const chunk of chunks) {
    const isRaw = isMainResponse(chunk.toolName)

    // handle block transitions
    if (currentBlock === null) {
      currentBlock = isRaw ? "raw" : "tools"
    } else if (currentBlock === "tools" && isRaw) {
      completeAll()
      currentBlock = "raw"
    } else if (currentBlock === "raw" && !isRaw) {
      completeLastRawIfAny()
      currentBlock = "tools"
    }

    const step = ensureStep(chunk.toolId, chunk.toolName)

    if (chunk.content) {
      const { type, text, annotations } = chunk.content

      if (annotations && annotations.length) {
        step.annotations.push(...annotations)
      }

      if (type === "token") {
        if (chunk.type === "stream_reasoning_message") {
          step.thoughtText += text
        } else {
          step.outputText += text
        }
      } else if (type === "message") {
        step.outputText += text
      } else if (type === "status") {
        if (!isRaw) {
          step.eventMessages.push(text)
          const t = text.toLowerCase()
          if (t.includes("fail")) step.state = "failed"
          else if (t.includes("complete") || t.includes("done") || t.includes("finish")) step.state = "completed"
          else if (t.includes("start")) step.state = "started"
        }
      }
    }

    yield {
      steps: order.map(id => toReasoningStep(stepsById.get(id)!))
    }
  }

  // finalize at stream end
  if (currentBlock === "raw") completeLastRawIfAny()
  if (currentBlock === "tools") completeAll()

  yield {
    steps: order.map(id => {
      const s = stepsById.get(id)!
      if (s.state !== "failed") s.state = "completed"
      return toReasoningStep(s)
    })
  }
}


/**
 * Extracts the description from a ReasoningStep.
 *
 * @param step - The ReasoningStep from which to extract the description.
 * @returns The description of the step, or an empty string if not available.
 */
export function extractStepDescription(step: ReasoningStep): { reasoning: string, message: string } {
  if (step.name !== RAW_MESSAGE) {
    if (step.eventMessages && step.eventMessages.length > 0) {
      return { reasoning: step.thought || "", message: step.eventMessages[step.eventMessages.length - 1] }
    }
    return { reasoning: step.thought || "", message: `Running \`${step.name}\`` }
  }
  return { reasoning: step.thought || "", message: step.output as string || "" }
}

// Extracts the web search URLs from a ReasoningStep.
export function getWebSearchUrls(step: ReasoningStep): UrlAnnotation[] {
  if (step.name === "web_search" && typeof step.output !== "string") {
    const out = step.output as WebSearchOutput
    return out.searchResults
  }
  return []
}
