import type { IconSvgElement } from "@hugeicons/react"
import type { Annotation, ToolOutput } from "./tool-outputs"
import {
  AiBrowserIcon,
  AiImageIcon,
  Album02Icon,
  ChipIcon,
  DashboardBrowsingIcon,
  NoteIcon,
  PencilEditIcon,
  Search01Icon,
  SourceCodeIcon,
  ThermometerWarmIcon,
} from "@hugeicons/core-free-icons"


/**
 * Represents the type of streaming message in the agent response.
 */
export type StreamingMessageType = "stream_message" | "stream_reasoning_message"


/**
 * Represents the type of streaming message content in the agent response.
 */
export type StreamingContentType = "token" | "status" | "message"


/**
 * Represents the execution state of a tool in the agent streaming response.
 */
export type ToolExecutionState = "started" | "completed" | "failed"


/**
 * Represents a message in the agent streaming response.
 */
export interface AgentStreamMessage {
  type: StreamingMessageType
  toolId: string
  toolName: ToolName
  content?: {
    type: StreamingContentType
    text: string
    annotations: Annotation[]
  }
  isStop: boolean | "error"
}


/**
 * Represents a persisted reasoning text step.
 */
export interface ReasoningTextStep {
  type: "reasoning_step"
  id: string
  reasoning: string
  message: string
}


/**
 * Represents a structured tool call step.
 */
export interface ToolCallStep {
  type: "tool_call"
  id: string
  name: ToolName
  thought: string
  output: ToolOutput
  state: ToolExecutionState
  eventMessages: string[]
  arguments?: { input: unknown }
}


/**
 * Represents one ordered item in the assistant process.
 */
export type ReasoningStep = ReasoningTextStep | ToolCallStep


/**
 * AgentResponse represents the response from the agent, containing reasoning steps.
 */
export interface AgentResponse {
  steps: ReasoningStep[]
  sentAt?: string
  isDeepResearch?: boolean
}


/**
 * Agent tool names enum.
 */
export type ToolName =
  | "web_search"
  | "memory_search"
  | "code_interpreter"
  | "create_note"
  | "edit_note"
  | "navigate"
  | "raw_message"
  | "image_generation"
  | "display_weather_widget"
  | "display_stock_widget"
  | "display_image_search_widget"


export const ToolNameDescription: Record<ToolName, string> = {
  web_search: "Search the web",
  memory_search: "Search memory",
  code_interpreter: "Interpret code",
  create_note: "Create note",
  edit_note: "Edit note",
  navigate: "Fetch and analyze web page content",
  raw_message: "Reasoning",
  image_generation: "Generate images based on prompts",
  display_weather_widget: "Display weather information",
  display_stock_widget: "Display stock information",
  display_image_search_widget: "Search for images from the web",
}


export const ToolNameIcon: Record<string, IconSvgElement> = {
  web_search: Search01Icon,
  memory_search: ChipIcon,
  navigate: AiBrowserIcon,
  code_interpreter: SourceCodeIcon,
  create_note: NoteIcon,
  edit_note: PencilEditIcon,
  image_generation: AiImageIcon,
  display_weather_widget: ThermometerWarmIcon,
  display_stock_widget: DashboardBrowsingIcon,
  display_image_search_widget: Album02Icon,
}


export const RAW_MESSAGE: ToolName = "raw_message"


/**
 * Checks whether a reasoning step is a text step.
 */
export const isReasoningTextStep = (step: ReasoningStep): step is ReasoningTextStep =>
  step.type === "reasoning_step"


/**
 * Checks whether a reasoning step is a tool call step.
 */
export const isToolCallStep = (step: ReasoningStep): step is ToolCallStep =>
  step.type === "tool_call"
