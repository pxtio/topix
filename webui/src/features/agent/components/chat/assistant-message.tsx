import { MarkdownView } from "@/components/markdown-view"
import { useChatStore } from "../../store/chat-store"
import { ReasoningStepsView } from "./reasoning-steps"
import { MiniLinkCard } from "../link-preview"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Copy, MousePointerClick } from "lucide-react"
import { extractNamedLinksFromMarkdown } from "../../utils/md"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import type { ChatMessage } from "../../types/chat"
import { isMainResponse } from "../../types/stream"
import { GenMindmapButton } from "./actions/gen-mindmap"


/**
 * Component that renders a list of sources for a chat response.
 */
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


/**
 * Component that renders action buttons for a chat response.
 */
const ResponseActions = ({ message }: { message: string }) => {
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Text copied to clipboard: ', text)
      toast('Text copied to clipboard!')
    }).catch(err => {
      console.error('Failed to copy text: ', err)
    })
  }

  return (
    <div className="flex flex-row items-center gap-2">
      <Button
        variant={null}
        className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted flex flex-row items-center gap-2"
        onClick={() => handleCopy(message)}
      >
        <Copy className='size-4 shrink-0' strokeWidth={1.75} />
        <span>Copy Answer</span>
      </Button>
      <GenMindmapButton message={message} />
    </div>
  )
}


/**
 * Component that renders the assistant's message in the chat.
 */
export const AssistantMessage = ({
  message,
  isStreaming = false
}: {
  message: ChatMessage
  isStreaming?: boolean // Whether the message is being streamed
}) => {
  const streamingMessage = useChatStore((state) => state.streams.get(message.id))

  const lastStep = streamingMessage?.steps?.[streamingMessage.steps.length - 1]

  // Determine if the last step message should be shown
  // whether it's a streaming response or a historical message
  const showLastStepMessage = (
    streamingMessage &&
    streamingMessage.steps.length > 0
  ) || message

  const messageContent = message.content ? message.content
    : lastStep?.response && isMainResponse(lastStep.name) ? lastStep.response
    : ""

  const agentResponse = streamingMessage ? streamingMessage : message.reasoningSteps ? { steps: message.reasoningSteps } : undefined

  const lastStepMessage = showLastStepMessage ? (
    <div className="w-full p-4">
      <MarkdownView content={messageContent} isStreaming={isStreaming} />
      {!isStreaming && <SourcesView answer={messageContent} />}
      {!isStreaming && <ResponseActions message={messageContent} />}
    </div>
  ) : null

  return (
    <div className='w-full'>
      {
        agentResponse &&
        <ReasoningStepsView response={agentResponse} />
      }
      {lastStepMessage}
    </div>
  )
}