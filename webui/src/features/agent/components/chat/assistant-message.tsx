import { MarkdownView } from "@/components/markdown/markdown-view"
import { useChatStore } from "../../store/chat-store"
import { ReasoningStepsView } from "./reasoning-steps"
import type { ChatMessage } from "../../types/chat"
import { isMainResponse } from "../../types/stream"
import { ResponseActions } from "./actions/response-actions"
import { useMemo } from "react"
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
  const streams = useChatStore((state) => state.streams)
  const isStreaming = useChatStore((state) => state.isStreaming)
  const streamingMessageId = useChatStore((state) => state.streamingMessageId)

  const streamingMessage = streams.get(message.id)
  const streaming = isStreaming && streamingMessageId === message.id

  const {
    showLastStepMessage,
    content,
    agentResponse,
    isDeepResearch,
  } = useMemo(() => {
    const sm = streamingMessage
    const messageSteps = message.properties.reasoning?.reasoning ?? []

    // pick the right source of truth for step metadata:
    // - if actively streaming and we have streaming steps, use those
    // - otherwise, use the historical message steps
    const effectiveSteps =
      sm?.steps?.length ? sm.steps : messageSteps

    const lastStep = effectiveSteps?.[effectiveSteps.length - 1]
    const firstStep = effectiveSteps?.[0]
    const isDeepResearch = firstStep?.name === 'outline_generator'
    const isSynthesis = lastStep?.name === 'synthesizer'
    const isAnswerReformulate = lastStep?.name === 'answer_reformulate'

    const showLastStepMessage =
      (effectiveSteps && effectiveSteps.length > 0) || !!message

    const messageContent = message.content.markdown ?? null

    // only relevant for active streaming; historical uses messageContent
    const rawContent =
      lastStep &&
      lastStep.output &&
      isMainResponse(lastStep.name)
        ? (lastStep.output as string)
        : ''

    let finalContent = ''
    if (isSynthesis || isAnswerReformulate) {
      finalContent = rawContent
    }

    const markdown = streaming
      ? finalContent
      : (messageContent || finalContent)

    const agentResponse =
      sm ??
      (messageSteps.length
        ? { steps: messageSteps }
        : undefined)

    return {
      showLastStepMessage,
      content: { markdown, isSynthesis },
      agentResponse,
      isDeepResearch,
    }
  }, [streamingMessage, message, streaming])

  const messageClass = clsx(
    "w-full p-4 space-y-2 min-w-0",
    content.isSynthesis && "rounded-xl border border-border shadow-sm",
    content.isSynthesis && !streaming && "overflow-y-auto scrollbar-thin max-h-[800px]"
  )

  const lastStepMessage = showLastStepMessage ? (
    <div className={messageClass}>
      <MarkdownView content={content.markdown} />
    </div>
  ) : null

  return (
    <div className='w-full space-y-4'>
      {agentResponse && (
        <ReasoningStepsView response={agentResponse} isStreaming={streaming} estimatedDurationSeconds={isDeepResearch ? 180 : undefined} />
      )}
      {lastStepMessage}
      {!streaming && agentResponse && <SourcesView answer={agentResponse} />}
      {!streaming && (
        <ResponseActions
          message={content.markdown}
          saveAsIs={content.isSynthesis}
        />
      )}
    </div>
  )
}