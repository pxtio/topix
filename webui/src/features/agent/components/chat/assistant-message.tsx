import { MarkdownView } from "@/components/markdown/markdown-view"
import { ReasoningStepsView } from "./reasoning-steps"
import type { ChatMessage } from "../../types/chat"
import { ResponseActions } from "./actions/response-actions"
import clsx from "clsx"
import { SourcesView } from "./sources-view"


/**
 * Component that renders the assistant's message in the chat.
 */
export const AssistantMessage = ({
  message,
}: {
  message: ChatMessage
}) => {
  const content = message.content
  const firstStep = message.properties?.reasoning?.reasoning[0]
  const lastStep = message.properties?.reasoning?.reasoning.slice(-1)[0]
  const isDeepResearch = firstStep?.name === 'outline_generator'
  const isSynthesis = lastStep?.name === 'synthesizer'
  const resp = { steps: message.properties?.reasoning?.reasoning || [] }

  const messageClass = clsx(
    "w-full p-4 space-y-2 min-w-0",
    isSynthesis && "rounded-xl border border-border shadow-sm p-6",
    isSynthesis && !message.streaming && "overflow-y-auto scrollbar-thin max-h-[800px]"
  )

  const lastStepMessage = message.content ? (
    <div className={messageClass}>
      <MarkdownView content={content.markdown} />
    </div>
  ) : null

  return (
    <div className='w-full space-y-4'>
      <ReasoningStepsView
        response={resp}
        isStreaming={message.streaming || false}
        estimatedDurationSeconds={isDeepResearch ? 180 : undefined}
      />
      {lastStepMessage}
      {!message.streaming && resp && <SourcesView answer={resp} />}
      {!message.streaming && (
        <ResponseActions
          message={message.content.markdown}
          saveAsIs={isSynthesis}
        />
      )}
    </div>
  )
}