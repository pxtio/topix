/**
 * Represents the type of streaming message in the agent response.
 */
export type StreamingMessageType = "token" | "status" | "message"


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
 * @property content - The content of the message, which can be of type StreamingMessageType and contains text.
 * @property is_stop - A boolean indicating whether the streaming has stopped.
 *
 * This interface is used to represent messages that are part of a stream from an agent, typically in a conversational AI context.
 * It includes information about the tool that generated the message, the type of content being streamed, and whether the streaming has stopped.
 */
export interface AgentStreamMessage {
    toolId: string
    toolName: ToolName
    content?: {
      type: StreamingMessageType
      text: string
    }
    isStop: boolean
}


/**
 * ReasoningStep represents a step in the agent's reasoning process.
 */
export interface ReasoningStep {
  id: string
  name: ToolName
  response: string
  state: ToolExecutionState
  eventMessages: string[]
  sources?: {
    type: "webpage",
    webpage: {
      name: string
      url: string
    }
  }[]
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
  | "answer_reformulate"
  | "knowledge_base_search"
  | "web_search"
  | "code_interpreter"
  | "key_points_extract"
  | "graph_conversion"
  | "raw_message"


// The RAW_MESSAGE tool name is used to indicate raw messages in the stream.
export const RAW_MESSAGE: ToolName = "raw_message"


export function isMainResponse(toolName: ToolName): boolean {
  return toolName === "raw_message" || toolName === "answer_reformulate"
}