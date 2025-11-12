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
  // fragment buffers (cleared after each flush)
  thoughtBuf: string[]
  outputBuf: string[]
  // canonical accumulated strings (joined incrementally)
  thoughtStr: string
  outputStr: string
  state: ToolExecutionState
  eventMessages: string[]
  annotations: Annotation[]
  executedCode?: string
  // marks that this step has unflushed changes
  dirty?: boolean
}

type BuildResponseOptions = {
  maxFps?: number
  safetyMaxIntervalMs?: number
  sizeThresholdChars?: number
  // optional caps (defensive)
  eventMessagesCap?: number
  annotationsCap?: number
}

/**
 * Build the final tool output for a reasoning step (uses canonical strings).
 */
const makeToolOutput = (acc: StepAccum): ToolOutput => {
  const outputText = acc.outputStr

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
  thought: acc.thoughtStr,
  output: makeToolOutput(acc),
  state: acc.state,
  eventMessages: acc.eventMessages
})

/**
 * Push with cap (keeps only most recent N).
 */
const pushCapped = <T>(arr: T[], item: T, cap: number) => {
  arr.push(item)
  if (cap > 0 && arr.length > cap) arr.splice(0, arr.length - cap)
}

/**
 * Push many with cap.
 */
const pushManyCapped = <T>(arr: T[], items: T[], cap: number) => {
  if (!items.length) return
  arr.push(...items)
  if (cap > 0 && arr.length > cap) arr.splice(0, arr.length - cap)
}

/**
 * Append and clear fragment buffers for a step.
 * This avoids re-joining the whole history each yield.
 */
const flushStep = (s: StepAccum) => {
  if (s.thoughtBuf.length) {
    s.thoughtStr += (s.thoughtBuf.length === 1 ? s.thoughtBuf[0] : s.thoughtBuf.join(""))
    s.thoughtBuf.length = 0
  }
  if (s.outputBuf.length) {
    s.outputStr += (s.outputBuf.length === 1 ? s.outputBuf[0] : s.outputBuf.join(""))
    s.outputBuf.length = 0
  }
}

/**
 * Stream agent response with throttling for performance and UX.
 * Uses incremental flush to minimize allocations and GC churn.
 */
export async function* buildResponse(
  chunks: AsyncGenerator<AgentStreamMessage>,
  opts: BuildResponseOptions = {}
): AsyncGenerator<{ response: AgentResponse, isStop: boolean }> {
  const {
    maxFps = 12,
    safetyMaxIntervalMs = 1000,
    sizeThresholdChars = 8000,
    eventMessagesCap = 100,
    annotationsCap = 1000
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
        thoughtStr: "",
        outputStr: "",
        state: "started",
        eventMessages: [],
        annotations: [],
        dirty: true
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
      s.dirty = true
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
        s.dirty = true
        break
      }
    }
  }

  /**
   * Yield updates conditionally, throttled by time/size/events.
   * Flushes only dirty steps to minimize allocations.
   */
  const maybeYield = async (force = false) => {
    const now = Date.now()
    const dueByTime = now - lastYieldAt >= minIntervalMs
    const hitSafety = now - lastYieldAt >= safetyMaxIntervalMs
    const hitSize = bufferedChars >= sizeThresholdChars

    if (force || shouldBurstYield || hitSize || hitSafety || (dueByTime && bufferedChars > 0)) {
      // flush only dirty steps
      for (const id of order) {
        const s = stepsById.get(id)!
        if (s.dirty) {
          flushStep(s)
          s.dirty = false
        }
      }

      shouldBurstYield = false
      const resp: AgentResponse = { steps: order.map(id => toReasoningStep(stepsById.get(id)!)) }
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
        pushManyCapped(step.annotations, annotations, annotationsCap)
        step.dirty = true
        shouldBurstYield = true
      }

      if (type === "token") {
        if (chunk.type === "stream_reasoning_message") {
          step.thoughtBuf.push(text)
          bufferedChars += text.length
          step.dirty = true
        } else {
          step.outputBuf.push(text)
          bufferedChars += text.length
          step.dirty = true
        }
      } else if (type === "message") {
        step.outputBuf.push(text)
        bufferedChars += text.length
        step.dirty = true
      } else if (type === "status" && !isRaw) {
        pushCapped(step.eventMessages, text, eventMessagesCap)
        const t = text.toLowerCase()
        const prev = step.state
        if (t.includes("fail")) step.state = "failed"
        else if (t.includes("complete") || t.includes("done") || t.includes("finish")) step.state = "completed"
        else if (t.includes("start")) step.state = "started"
        if (step.state !== prev) shouldBurstYield = true
        step.dirty = true
      }
    }

    const maybe = await maybeYield(false)
    if (maybe) yield maybe
  }

  // finalize at end
  if (currentBlock === "raw") completeLastRawIfAny()
  if (currentBlock === "tools") completeAll()

  // final flush of any remaining fragments
  for (const id of order) {
    const s = stepsById.get(id)!
    flushStep(s)
  }

  const finalResp: AgentResponse = {
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