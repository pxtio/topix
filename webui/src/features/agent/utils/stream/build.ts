import type { AgentResponse, ReasoningStep, ToolCallStep, ToolExecutionState, ToolName } from "../../types/stream"
import { RAW_MESSAGE, ToolNameDescription, isReasoningTextToolName } from "../../types/stream"
import { simpleTransform } from "./transform"
import type {
  CreateNoteOutput,
  EditNoteOutput,
  WebSearchOutput,
  MemorySearchOutput,
  ToolOutput,
  Annotation,
  UrlAnnotation
} from "../../types/tool-outputs"

type BlockKind = "raw" | "tools" | null

type StepAccum = {
  id: string
  name: ToolName
  reasoningBuf: string[]
  messageBuf: string[]
  reasoning: string
  message: string
  state: ToolExecutionState
  eventMessages: string[]
  annotations: Annotation[]
  dirty?: boolean
}

type BuildResponseOptions = {
  maxFps?: number
  safetyMaxIntervalMs?: number
  sizeThresholdChars?: number
  eventMessagesCap?: number
  annotationsCap?: number
}


/**
 * Builds a lightweight preview tool output for streaming.
 */
const makeToolOutput = (acc: StepAccum): ToolOutput => {
  if (acc.name === "web_search") {
    const urls = acc.annotations.filter(a => a.type === "url") as WebSearchOutput["searchResults"]
    return { type: "web_search", answer: "", searchResults: urls }
  }
  if (acc.name === "memory_search") {
    const refs = acc.annotations.filter(a => a.type === "reference") as MemorySearchOutput["references"]
    return { type: "memory_search", answer: "", references: refs }
  }
  if (acc.name === "code_interpreter") {
    return {
      type: "code_interpreter",
      status: acc.state === "failed" ? "error" : "success",
      stdout: "",
      stderr: "",
      durationMs: 0
    }
  }
  if (acc.name === "create_note") {
    return {
      type: "create_note",
      noteId: "",
      graphUid: "",
      label: "",
      noteType: "rectangle",
      parentId: null,
    }
  }
  if (acc.name === "edit_note") {
    return {
      type: "edit_note",
      noteId: "",
      graphUid: "",
      label: "",
      noteType: "rectangle",
      parentId: null,
    }
  }

  return ""
}


/**
 * Converts one streaming accumulator into a renderable step.
 */
const toReasoningStep = (acc: StepAccum): ReasoningStep => {
  if (isReasoningTextToolName(acc.name)) {
    return {
      type: "reasoning_step",
      id: acc.id,
      reasoning: acc.reasoning,
      message: acc.message,
      isSynthesis: acc.name === "synthesizer",
    }
  }

  return {
    type: "tool_call",
    id: acc.id,
    name: acc.name,
    thought: acc.reasoning,
    output: makeToolOutput(acc),
    state: acc.state,
    eventMessages: acc.eventMessages,
  } satisfies ToolCallStep
}


const pushCapped = <T>(arr: T[], item: T, cap: number) => {
  arr.push(item)
  if (cap > 0 && arr.length > cap) arr.splice(0, arr.length - cap)
}


const pushManyCapped = <T>(arr: T[], items: T[], cap: number) => {
  if (!items.length) return
  arr.push(...items)
  if (cap > 0 && arr.length > cap) arr.splice(0, arr.length - cap)
}


/**
 * Flushes buffered reasoning/message fragments into canonical strings.
 */
const flushStep = (s: StepAccum) => {
  if (s.reasoningBuf.length) {
    s.reasoning += s.reasoningBuf.length === 1 ? s.reasoningBuf[0] : s.reasoningBuf.join("")
    s.reasoningBuf.length = 0
  }

  if (s.messageBuf.length) {
    s.message += s.messageBuf.length === 1 ? s.messageBuf[0] : s.messageBuf.join("")
    s.messageBuf.length = 0
  }
}


/**
 * Builds a readable fallback title when a tool name is not in the display map.
 */
const getToolTitle = (toolName: ToolName) =>
  ToolNameDescription[toolName] || toolName.replaceAll("_", " ")


export async function* buildResponse(
  chunks: AsyncGenerator<Record<string, unknown>>,
  opts: BuildResponseOptions = {}
): AsyncGenerator<{ response: AgentResponse, isStop: boolean }> {
  const {
    maxFps = 10,
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

  const stepKeyFor = (toolId: string, toolName: ToolName) =>
    isReasoningTextToolName(toolName) ? `${toolId}:${rawBlockIndex}` : toolId

  const ensureStep = (toolId: string, toolName: ToolName) => {
    const key = stepKeyFor(toolId, toolName)
    let step = stepsById.get(key)

    if (!step) {
      step = {
        id: key,
        name: toolName,
        reasoningBuf: [],
        messageBuf: [],
        reasoning: "",
        message: "",
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

  const completeStep = (toolId: string, failed = false) => {
    const step = stepsById.get(toolId)
    if (!step) return
    step.state = failed ? "failed" : "completed"
    step.dirty = true
  }

  const maybeYield = async (force = false) => {
    const now = Date.now()
    const dueByTime = now - lastYieldAt >= minIntervalMs
    const hitSafety = now - lastYieldAt >= safetyMaxIntervalMs
    const hitSize = bufferedChars >= sizeThresholdChars

    if (force || shouldBurstYield || hitSize || hitSafety || (dueByTime && bufferedChars > 0)) {
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

  for await (const rawChunk of chunks) {
    if (rawChunk.type === "tool_call") {
      continue
    }

    const chunk = simpleTransform(rawChunk)
    const isRaw = isReasoningTextToolName(chunk.toolName)

    if (chunk.content?.type === "status" && isReasoningTextToolName(chunk.toolName)) continue

    if (currentBlock === null) {
      currentBlock = isRaw ? "raw" : "tools"
      if (currentBlock === "raw") rawBlockIndex++
    } else if (currentBlock === "tools" && isRaw) {
      currentBlock = "raw"
      rawBlockIndex++
      shouldBurstYield = true
    } else if (currentBlock === "raw" && !isRaw) {
      currentBlock = "tools"
      shouldBurstYield = true
    }

    const step = ensureStep(chunk.toolId, chunk.toolName)

    if (chunk.content) {
      const { type, text, annotations } = chunk.content

      if (annotations?.length && !isReasoningTextToolName(chunk.toolName)) {
        pushManyCapped(step.annotations, annotations, annotationsCap)
        step.dirty = true
      }

      if (type === "token" || type === "message") {
        if (isReasoningTextToolName(chunk.toolName)) {
          if (chunk.type === "stream_reasoning_message") {
            step.reasoningBuf.push(text)
          } else {
            step.messageBuf.push(text)
          }
        }
        bufferedChars += text.length
        step.dirty = true
      } else if (type === "status" && !isReasoningTextToolName(chunk.toolName)) {
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

    if (chunk.isStop) {
      completeStep(chunk.toolId, chunk.isStop === "error")
      shouldBurstYield = true
    }

    const maybe = await maybeYield(false)
    if (maybe) yield maybe
  }

  for (const id of order) {
    const step = stepsById.get(id)!
    flushStep(step)
    if (step.state !== "failed") step.state = "completed"
  }

  const finalResp: AgentResponse = {
    steps: order.map((id) => toReasoningStep(stepsById.get(id)!))
  }

  yield { response: finalResp, isStop: true }
}


/**
 * Extracts a short input/query string for display from a tool call step.
 */
export function extractInputOrQuery(step: ToolCallStep): string | null {
  const args = step.arguments
  if (!args) return null

  const input = args.input

  if (typeof input === "string") return input

  if (typeof input === "object" && input !== null) {
    const inputRecord = input as Record<string, unknown>

    if ("query" in inputRecord && typeof inputRecord.query === "string") {
      return inputRecord.query
    }

    if ("url" in inputRecord && typeof inputRecord.url === "string") {
      return inputRecord.url
    }

    if ("code" in inputRecord && typeof inputRecord.code === "string") {
      return inputRecord.code
    }
  }

  return null
}


/**
 * Builds display text for one step in the merged assistant timeline.
 */
export function extractStepDescription(step: ReasoningStep): { reasoning: string, message: string, title: string, input?: string } {
  if (step.type === "reasoning_step") {
    return {
      reasoning: step.reasoning || "",
      message: step.message || "",
      title: step.message ? "Response" : getToolTitle(RAW_MESSAGE),
    }
  }

  let input: string | undefined = undefined
  if (
    step.name === "web_search" ||
    step.name === "memory_search" ||
    step.name === "navigate" ||
    step.name === "code_interpreter"
  ) {
    input = extractInputOrQuery(step) || undefined
  }

  if (step.name === "code_interpreter" && typeof step.output !== "string") {
    return {
      reasoning: step.thought || "",
      message: "",
      title: getToolTitle(step.name),
      input
    }
  }

  if (step.name === "create_note" && typeof step.output !== "string") {
    const output = step.output as CreateNoteOutput
    const typeLabel = output.noteType.replace(/-/g, " ")
    return {
      reasoning: step.thought || "",
      message: output.label
        ? `Created ${typeLabel} note "${output.label}".`
        : `Created ${typeLabel} note.`,
      title: getToolTitle(step.name),
      input
    }
  }

  if (step.name === "edit_note" && typeof step.output !== "string") {
    const output = step.output as EditNoteOutput
    const typeLabel = output.noteType.replace(/-/g, " ")
    return {
      reasoning: step.thought || "",
      message: output.label
        ? `Updated note "${output.label}" as ${typeLabel}.`
        : `Updated note as ${typeLabel}.`,
      title: getToolTitle(step.name),
      input
    }
  }

  if (isReasoningTextToolName(step.name)) {
    return {
      reasoning: step.thought || "",
      message: typeof step.output === "string" ? step.output : "",
      title: getToolTitle(step.name),
      input
    }
  }

  return { reasoning: step.thought || "", message: "", title: getToolTitle(step.name), input }
}


/**
 * Extracts URL annotations from a web search tool step.
 */
export function getWebSearchUrls(step: ReasoningStep): UrlAnnotation[] {
  if (step.type === "tool_call" && step.name === "web_search" && typeof step.output !== "string") {
    const out = step.output as WebSearchOutput
    return out.searchResults
  }
  return []
}
