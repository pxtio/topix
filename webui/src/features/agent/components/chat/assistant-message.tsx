import { ReasoningStepsView } from "./reasoning-steps"
import type { ChatMessage } from "../../types/chat"
import { ResponseActions } from "./actions/response-actions"
import { useMemo } from "react"
import { isReasoningTextStep } from "../../types/stream"
import { SourcesView } from "./sources-view"


/**
 * Renders the assistant message as a single merged process view.
 */
export const AssistantMessage = ({
  message,
}: {
  message: ChatMessage
}) => {
  const steps = message.properties?.reasoning?.reasoning || []
  const resp = { steps, sentAt: message.sentAt, isDeepResearch: message.isDeepResearch }

  const responseMarkdown = useMemo(
    () => steps.filter(isReasoningTextStep).map((step) => step.message).join(""),
    [steps]
  )

  return (
    <div className='w-full space-y-2'>
      <ReasoningStepsView
        response={resp}
        isStreaming={message.streaming || false}
      />
      {!message.streaming && <SourcesView answer={resp} />}
      {!message.streaming && responseMarkdown && (
        <ResponseActions
          message={responseMarkdown}
        />
      )}
    </div>
  )
}
