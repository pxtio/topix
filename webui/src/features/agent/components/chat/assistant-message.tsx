import { MarkdownView } from "@/components/markdown/markdown-view"
import { useChatStore } from "../../store/chat-store"
import { ReasoningStepsView } from "./reasoning-steps"
import { LinkPreviewCard } from "../link-preview"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import type { ChatMessage } from "../../types/chat"
import { isMainResponse, type AgentResponse } from "../../types/stream"
import { extractAnswerWebSources } from "../../utils/url"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link04Icon } from "@hugeicons/core-free-icons"
import { ResponseActions } from "./actions/response-actions"
import { useMemo } from "react"


/**
 * Component that renders a list of sources for a chat response.
 */
const SourcesView = ({ answer }: { answer: AgentResponse }) => {
  const annotations = extractAnswerWebSources(answer)

  if (annotations.length === 0) return null

  return (
    <div className='w-full mt-2 min-w-0'>
      <div className='w-full border-b border-border p-2 flex items-center gap-2'>
        <HugeiconsIcon icon={Link04Icon} className='size-5 shrink-0 text-primary' strokeWidth={1.75} />
        <span className='text-base text-primary font-semibold'>Sources</span>
      </div>

      {/* Root must not overflow its parent */}
      <ScrollArea className='w-full overflow-hidden'>
        <div
          className='px-2 py-4 flex flex-wrap md:flex-nowrap gap-2 md:w-max
                     md:overflow-visible'
        >
          {annotations.map((annotation, index) => (
            <div key={index} className='shrink-0'>
              <LinkPreviewCard
                annotation={annotation}
              />
            </div>
          ))}
        </div>

        {/* horizontal scrollbar with transparent track */}
        <ScrollBar
          orientation='horizontal'
          className='scrollbar-thin scrollbar-thumb-rounded-lg
                     scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent'
        />
      </ScrollArea>
    </div>
  )
}


/**
 * Component that renders the assistant's message in the chat.
 */
export const AssistantMessage = ({
  message,
}: {
  message: ChatMessage
}) => {
  const streamingMessage = useChatStore((state) => state.streams.get(message.id))
  const isStreaming = useChatStore((state) => state.isStreaming)
  const streamingMessageId = useChatStore((state) => state.streamingMessageId)

  const streaming = isStreaming && streamingMessageId === message.id

  const lastStep = streamingMessage?.steps?.[streamingMessage.steps.length - 1]

  // Determine if the last step message should be shown
  // whether it's a streaming response or a historical message
  const showLastStepMessage = (
    streamingMessage &&
    streamingMessage.steps.length > 0
  ) || message

  const messageContent = message.content.markdown ? message.content.markdown : null

  const rawContent = lastStep?.output && isMainResponse(lastStep.name) ?
    lastStep.output as string
    :
    ""

  const finalContent = useMemo(() => {
    if (streamingMessage && streamingMessage.steps.length > 0) {
      const uniqueRawMessageIds = new Set(
        streamingMessage.steps
          .filter(step => isMainResponse(step.name))
          .map(step => step.id.split('::')[0])
      )
      if (uniqueRawMessageIds.size > 1) {
        return rawContent
      }
    }
    return ""
  }, [rawContent, streamingMessage])


  const markdownMessage = streaming ? finalContent : (messageContent ? messageContent : finalContent)

  const agentResponse = streamingMessage ?
    streamingMessage
    :
    message.properties.reasoning?.reasoning ?
    { steps: message.properties.reasoning.reasoning }
    :
    undefined

  const lastStepMessage = showLastStepMessage ? (
    <div className="w-full p-4 space-y-2 min-w-0">
      <MarkdownView content={markdownMessage} />
      {!streaming && agentResponse && <SourcesView answer={agentResponse} />}
      {!streaming && <ResponseActions message={markdownMessage} />}
    </div>
  ) : null

  return (
    <div className='w-full space-y-4'>
      {
        agentResponse &&
        <ReasoningStepsView response={agentResponse} isStreaming={streaming} />
      }
      {lastStepMessage}
    </div>
  )
}