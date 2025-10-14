import type {
  AgentStreamMessage,
  AgentResponse,
  ReasoningStep,
  ToolExecutionState,
  ToolName
} from "../../types/stream"
import { RAW_MESSAGE, ToolNameDescription, isMainResponse } from "../../types/stream"
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
  thoughtBuf: string[]          // array buffer for model thoughts
  outputBuf: string[]           // array buffer for visible output
  state: ToolExecutionState
  eventMessages: string[]
  annotations: Annotation[]
  executedCode?: string
}

type BuildResponseOptions = {
  maxFps?: number
  safetyMaxIntervalMs?: number
  sizeThresholdChars?: number
}

/**
 * Join a buffer efficiently into a single string.
 */
const joinBuf = (buf: string[]) => (buf.length === 1 ? buf[0] : buf.join(""))

/**
 * Build the final tool output for a reasoning step.
 */
const makeToolOutput = (acc: StepAccum): ToolOutput => {
  const outputText = joinBuf(acc.outputBuf)

  if (acc.name === "web_search") {
    const urls = acc.annotations.filter(a => a.type === "url") as WebSearchOutput["searchResults"]
    return { type: "web_search", answer: outputText, searchResults: urls }
  }
  if (acc.name === "memory_search") {
    const refs = acc.annotations.filter(a => a.type === "reference") as MemorySearchOutput["references"]
    return { type: "memory_search", answer: outputText, references: refs }
  }
  if (acc.name === "code_interpreter") {
    const files = acc.annotations.filter(a => a.type === "file") as CodeInterpreterOutput["annotations"]
    return {
      type: "code_interpreter",
      answer: outputText,
      executedCode: acc.executedCode ?? "",
      annotations: files
    }
  }
  return outputText
}

/**
 * Converts a step accumulator into a reasoning step.
 */
const toReasoningStep = (acc: StepAccum): ReasoningStep => ({
  id: acc.id,
  name: acc.name,
  thought: joinBuf(acc.thoughtBuf),
  output: makeToolOutput(acc),
  state: acc.state,
  eventMessages: acc.eventMessages
})

/**
 * Stream agent response with throttling for performance and UX.
 * Uses string array buffers to avoid O(n²) concat cost.
 */
export async function* buildResponse(
  chunks: AsyncGenerator<AgentStreamMessage>,
  opts: BuildResponseOptions = {}
): AsyncGenerator<{ response: AgentResponse, isStop: boolean }> {
  const {
    maxFps = 24,
    safetyMaxIntervalMs = 1000,
    sizeThresholdChars = 2000
  } = opts

  const minIntervalMs = Math.max(1, Math.floor(1000 / maxFps))
  let lastYieldAt = 0
  let bufferedChars = 0

  const stepsById = new Map<string, StepAccum>()
  const order: string[] = []
  let currentBlock: BlockKind = null
  let rawBlockIndex = -1
  let shouldBurstYield = false

  /**
   * Compute a unique key for step identity.
   */
  const stepKeyFor = (toolId: string, toolName: ToolName) =>
    isMainResponse(toolName) ? `${toolId}::raw:${rawBlockIndex}` : toolId

  /**
   * Ensure a step exists in the map, create if missing.
   */
  const ensureStep = (toolId: string, toolName: ToolName) => {
    const key = stepKeyFor(toolId, toolName)
    let step = stepsById.get(key)
    if (!step) {
      step = {
        id: key,
        name: toolName,
        thoughtBuf: [],
        outputBuf: [],
        state: "started",
        eventMessages: [],
        annotations: []
      }
      stepsById.set(key, step)
      order.push(key)
      shouldBurstYield = true
    } else {
      step.name = toolName
    }
    return step
  }

  /**
   * Mark all steps as completed if not failed.
   */
  const completeAll = () => {
    for (const id of order) {
      const s = stepsById.get(id)!
      if (s.state !== "failed") s.state = "completed"
    }
  }

  /**
   * Mark the last raw step as completed if exists.
   */
  const completeLastRawIfAny = () => {
    for (let i = order.length - 1; i >= 0; i--) {
      const s = stepsById.get(order[i])!
      if (s.name === RAW_MESSAGE || isMainResponse(s.name)) {
        if (s.state !== "failed") s.state = "completed"
        break
      }
    }
  }

  /**
   * Yield updates conditionally, throttled by time/size/events.
   */
  const maybeYield = async (force = false) => {
    const now = Date.now()
    const dueByTime = now - lastYieldAt >= minIntervalMs
    const hitSafety = now - lastYieldAt >= safetyMaxIntervalMs
    const hitSize = bufferedChars >= sizeThresholdChars

    if (force || shouldBurstYield || hitSize || hitSafety || (dueByTime && bufferedChars > 0)) {
      shouldBurstYield = false
      const resp = { steps: order.map(id => toReasoningStep(stepsById.get(id)!)) }
      lastYieldAt = now
      bufferedChars = 0
      return { response: resp, isStop: false }
    }
    return null
  }

  for await (const chunk of chunks) {
    const isRaw = isMainResponse(chunk.toolName)

    if (isRaw && chunk.content?.type === "status") continue

    // handle block transitions
    if (currentBlock === null) {
      currentBlock = isRaw ? "raw" : "tools"
      if (currentBlock === "raw") rawBlockIndex++
      shouldBurstYield = true
    } else if (currentBlock === "tools" && isRaw) {
      completeAll()
      currentBlock = "raw"
      rawBlockIndex++
      shouldBurstYield = true
    } else if (currentBlock === "raw" && !isRaw) {
      completeLastRawIfAny()
      currentBlock = "tools"
      shouldBurstYield = true
    }

    const step = ensureStep(chunk.toolId, chunk.toolName)

    if (chunk.content) {
      const { type, text, annotations } = chunk.content

      if (annotations?.length) {
        step.annotations.push(...annotations)
        shouldBurstYield = true
      }

      if (type === "token") {
        if (chunk.type === "stream_reasoning_message") {
          step.thoughtBuf.push(text)
          bufferedChars += text.length
        } else {
          step.outputBuf.push(text)
          bufferedChars += text.length
        }
      } else if (type === "message") {
        step.outputBuf.push(text)
        bufferedChars += text.length
      } else if (type === "status" && !isRaw) {
        step.eventMessages.push(text)
        const t = text.toLowerCase()
        const prev = step.state
        if (t.includes("fail")) step.state = "failed"
        else if (t.includes("complete") || t.includes("done") || t.includes("finish")) step.state = "completed"
        else if (t.includes("start")) step.state = "started"
        if (step.state !== prev) shouldBurstYield = true
      }
    }

    const maybe = await maybeYield(false)
    if (maybe) yield maybe
  }

  // finalize at end
  if (currentBlock === "raw") completeLastRawIfAny()
  if (currentBlock === "tools") completeAll()

  const finalResp = {
    steps: Array.from(order, id => {
      const s = stepsById.get(id)!
      if (s.state !== "failed") s.state = "completed"
      return toReasoningStep(s)
    })
  }

  yield { response: finalResp, isStop: true }
}

/**
 * Extracts a human-readable description from a reasoning step.
 */
export function extractStepDescription(step: ReasoningStep): { reasoning: string, message: string, title: string } {
  if (step.name !== "raw_message" && step.name !== "outline_generator") {
    return { reasoning: step.thought || "", message: "", title: ToolNameDescription[step.name] }
  }
  const reasoningOutLoud = (step.output as string) || ""
  return { reasoning: step.thought || "", message: reasoningOutLoud, title: ToolNameDescription[step.name] }
}

/**
 * Returns web search result URLs from a step.
 */
export function getWebSearchUrls(step: ReasoningStep): UrlAnnotation[] {
  if (step.name === "web_search" && typeof step.output !== "string") {
    const out = step.output as WebSearchOutput
    return out.searchResults
  }
  return []
}