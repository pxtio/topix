import { MarkdownView } from "@/components/markdown-view"
import { useChatStore } from "../../store/chat-store"
import { ReasoningStepsView } from "./reasoning-steps"


export const AssistantMessage = ({
  message_id,
  message = undefined,
}: {
  message_id: string,
  message?: string
}) => {
  const streamingMessage = useChatStore((state) => state.streams.get(message_id))

  const lastStep = streamingMessage?.steps?.[streamingMessage.steps.length - 1]
  const showLastStepMessage = (
    streamingMessage &&
    streamingMessage.steps.length > 0
  ) || message

  const messageContent = message || lastStep?.content || ''

  const lastStepMessage = showLastStepMessage ? (
    <div className="w-full p-4">
      <MarkdownView content={messageContent} />
    </div>
  ) : null

  return (
    <div className='w-full'>
      {
        streamingMessage &&
        <ReasoningStepsView response={streamingMessage} />
      }
      {lastStepMessage}
    </div>
  )
}