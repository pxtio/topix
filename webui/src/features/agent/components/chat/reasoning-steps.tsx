import { useMemo } from "react"
import { isReasoningTextStep, type AgentResponse } from "../../types/stream"
import { ReasoningStepRow } from "./reasoning-step-row"
import { ToolStepRow } from "./tool-step-row"
import { buildToolStepWidgetAttachments } from "./tool-step-widgets"


export interface ReasoningStepsViewProps {
  isStreaming: boolean
  response?: AgentResponse
  estimatedDurationSeconds?: number
}


/**
 * Renders the assistant process as one ordered merged list.
 */
export const ReasoningStepsView = ({ isStreaming, response }: ReasoningStepsViewProps) => {
  if (!response) {
    return null
  }

  const widgetAttachments = useMemo(
    () => buildToolStepWidgetAttachments(response.steps, isStreaming),
    [isStreaming, response.steps]
  )

  return (
    <div className='w-full flex flex-col items-start'>
      {response.steps.map((step, index) => (
        isReasoningTextStep(step) ? (
          <ReasoningStepRow
            key={step.id}
            step={step}
            isStreaming={isStreaming}
          />
        ) : (
          <ToolStepRow
            key={step.id}
            step={step}
            isStreaming={isStreaming}
            attachment={widgetAttachments.get(index)}
          />
        )
      ))}
    </div>
  )
}
