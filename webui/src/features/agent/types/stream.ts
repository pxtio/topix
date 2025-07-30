/**
 * Represents the type of streaming message in the agent response.
 */
export type StreamingMessageType = "token" | "state"


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
 * @property type - The type of the streaming message, which can be either "token" or "state".
 * @property toolId - The ID of the tool associated with the message.
 * @property toolName - The name of the tool associated with the message.
 * @property executionState - The execution state of the tool, which can be "started", "completed", or "failed".
 * @property statusMessage - An optional status message providing additional context about the tool's execution.
 * @property delta - An optional delta object containing the content of the
 */
export interface AgentStreamMessage {
    type: StreamingMessageType
    toolId: string
    toolName: string
    executionState?: ToolExecutionState
    statusMessage?: string
    delta?: StreamDelta
}


/**
 * ReasoningStep represents a step in the agent's reasoning process.
 */
export interface ReasoningStep {
  id: string
  name: string
  content?: string
  state: ToolExecutionState
  message?: string
}


/**
 * AgentResponse represents the response from the agent, containing reasoning steps.
 */
export interface AgentResponse {
  steps: ReasoningStep[]
}


export const RAW_RESPONSE = "raw_message"