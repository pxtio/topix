import type { IconSvgElement } from "@hugeicons/react"
import type { Annotation, ToolOutput } from "./tool-outputs"
import { AiBrowserIcon, ChipIcon, GlobalSearchIcon, Search01Icon, SourceCodeIcon, TextAlignLeftIcon } from "@hugeicons/core-free-icons"

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
 * Represents a delta in the streaming response.
 *
 * @property content - The content of the delta, which is a string that can represent a part of the message being streamed.
 */
export interface StreamDelta {
    content: string
}


/**
 * Represents a message in the agent streaming response.
 *
 * @property toolId - The ID of the tool that generated the message.
 * @property toolName - The name of the tool that generated the message.
 * @property content - The content of the message, which can be of type StreamingContentType and contains text.
 * @property is_stop - A boolean indicating whether the streaming has stopped.
 *
 * This interface is used to represent messages that are part of a stream from an agent, typically in a conversational AI context.
 * It includes information about the tool that generated the message, the type of content being streamed, and whether the streaming has stopped.
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
    isStop: boolean
}


/**
 * ReasoningStep represents a step in the agent's reasoning process.
 */
export interface ReasoningStep {
  id: string
  name: ToolName
  thought: string
  output: ToolOutput
  state: ToolExecutionState
  eventMessages: string[]
}


/**
 * AgentResponse represents the response from the agent, containing reasoning steps.
 */
export interface AgentResponse {
  steps: ReasoningStep[]
}


/**
 * Agent tool names enum
 */
export type ToolName =
  | "web_search"
  | "memory_search"
  | "code_interpreter"
  | "navigate"
  | "raw_message"
  | "outline_generator"
  | "web_collector"
  | "synthesizer"


export const ToolNameDescription: Record<ToolName, string> = {
  "web_search": "Search the web",
  "memory_search": "Search memory",
  "code_interpreter": "Interpret code",
  "navigate": "Fetch and analyze web page content",
  "raw_message": "Reasoning",
  "outline_generator": "Generate an outline for the topic",
  "web_collector": "Collect information from the web",
  "synthesizer": "Synthesize information from multiple sources",
}

export const ToolNameIcon: Record<string, IconSvgElement> = {
  "web_search": Search01Icon,
  "memory_search": ChipIcon,
  "navigate": AiBrowserIcon,
  "code_interpreter": SourceCodeIcon,
  "outline_generator": TextAlignLeftIcon,
  "web_collector": GlobalSearchIcon
}

// The RAW_MESSAGE tool name is used to indicate raw messages in the stream.
export const RAW_MESSAGE: ToolName = "raw_message"


export function isMainResponse(toolName: ToolName): boolean {
  return toolName === "raw_message" || toolName === "synthesizer" || toolName === "outline_generator"
}