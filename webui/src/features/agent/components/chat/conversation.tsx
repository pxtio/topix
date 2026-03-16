import { useAppStore } from "@/store"
import { useListMessages } from "../../api/list-messages"
import { useChatStore } from "../../store/chat-store"
import { UserMessage } from "./user-message"
import { AssistantMessage } from "./assistant-message"
import type { ChatMessage } from "../../types/chat"
import { TreeAgentIcon } from "./tree-thinking-indicator"


/**
 * MessageView component renders a chat message based on its role.
 */
const MessageView = ({
  chatMessage,
  isLatestUserMessage,
}: { chatMessage: ChatMessage, isLatestUserMessage: boolean }) => {
  switch (chatMessage.role) {
    case "user":
      return (
        <UserMessage
          message={chatMessage}
          isLatest={isLatestUserMessage}
        />
      )
    case "assistant":
      return <AssistantMessage
        message={chatMessage}
      />
    default:
      return null
  }
}

const EMPTY_MESSAGES: ChatMessage[] = []


/**
 * TrailingAssistantIndicator renders the assistant marker at the end of the conversation.
 */
const TrailingAssistantIndicator = ({ isStreaming }: { isStreaming: boolean }) => {
  return (
    <div className='w-full flex justify-start'>
      <div className='min-h-9'>
        <TreeAgentIcon isStopped={!isStreaming} />
      </div>
    </div>
  )
}

/**
 * Conversation component displays a chat conversation by fetching messages
 * and rendering them based on their roles (user or assistant).
 */
export const Conversation = ({ chatId }: { chatId: string }) => {
  const userId = useAppStore((state) => state.userId)
  const isStreaming = useChatStore((state) => state.isStreaming)

  const { data: serverMessages } = useListMessages({ userId, chatId })

  const messages = serverMessages || EMPTY_MESSAGES

  const userMessages = messages?.filter((m) => m.role === "user")
  const lastUserMessageId = userMessages?.at(-1)?.id

  const items = messages.map((message) => (
    <MessageView
      key={message.id}
      chatMessage={message}
      isLatestUserMessage={message.id === lastUserMessageId}
    />
  ))

  return (
    <>
      <div className='mt-32 flex flex-col items-end space-y-1'>
        {items}
        {messages.length > 0 && <TrailingAssistantIndicator isStreaming={isStreaming} />}
        <div className='h-screen'>
        </div>
      </div>
    </>
  )
}
