import { useAppStore } from "@/store"
import { useListMessages } from "../../api/list-messages"
import { UserMessage } from "./user-message"
import { AssistantMessage } from "./assistant-message"
import type { ChatMessage } from "../../types/chat"
import { useChatStore } from "../../store/chat-store"
import { ThinkingDots } from "@/components/progress-bar"


/**
 * MessageView component renders a chat message based on its role.
 */
const MessageView = ({
  chatMessage,
  isLatestUserMessage,
}: { chatMessage: ChatMessage, isLatestUserMessage: boolean }) => {
  switch (chatMessage.role) {
    case "user":
      return <UserMessage
        message={chatMessage.content.markdown}
        isLatest={isLatestUserMessage}
      />
    case "assistant":
      return <AssistantMessage
        message={chatMessage}
      />
    default:
      return null
  }
}


/**
 * Conversation component displays a chat conversation by fetching messages
 * and rendering them based on their roles (user or assistant).
 */
export const Conversation = ({ chatId }: { chatId: string }) => {
  const userId = useAppStore((state) => state.userId)

  const { isStreaming, streamingMessageId } = useChatStore()

  const { data: messages } = useListMessages({ userId, chatId })

  if (!messages) return null

  const items = messages?.map((message) => (
    <MessageView
      key={message.id}
      chatMessage={message}
      isLatestUserMessage={
        (
          message.id === messages[messages.length - 1]?.id
          && message.role === "user"
        ) || (
          message.id === messages[messages.length - 2]?.id
          && message.role === "user"
        )
      }
    />
  )) || []

  return (
    <>
      <div className='flex flex-col flex-1 w-full space-y-8 pt-6'>
        {items}
        {
          isStreaming && !streamingMessageId &&
          <div className='w-full flex flex-row justify-start items-center'>
            <ThinkingDots message="Thinking..." />
          </div>
        }
        </div>
    </>
  )
}