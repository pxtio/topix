import { MarkdownView } from "@/components/markdown-view"
import { useChatStore } from "../../store/chat-store"
import { ReasoningStepsView } from "./reasoning-steps"
import { MiniLinkCard } from "../link-preview"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { MousePointerClick } from "lucide-react"
import { extractNamedLinksFromMarkdown } from "../../utils/md"


const SourcesView = ({
  answer
}: {
  answer: string
}) => {
  const links = extractNamedLinksFromMarkdown(answer)
  if (links.length === 0) {
    return null
  }
  return (
    <div className="w-full p-2">
      <div className="w-full border-b border-border p-2 flex flex-row items-center gap-2">
        <MousePointerClick className='size-4 shrink-0 text-primary' strokeWidth={1.75}/>
        <span className="text-base text-primary font-semibold">Sources</span>
      </div>
      <ScrollArea className='w-full' >
        <div className="flex flex-row gap-1 px-2 py-4">
          {links.map((link, index) => <MiniLinkCard key={index} url={link.url} siteName={link.siteName} />)}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}


export const AssistantMessage = ({
  message_id,
  message = undefined,
  isStreaming = false
}: {
  message_id: string,
  message?: string
  isStreaming?: boolean
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
      <MarkdownView content={messageContent} isStreaming={isStreaming} />
      {!isStreaming && <SourcesView answer={messageContent} />}
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