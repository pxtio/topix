import { useAppStore } from "@/store"
import { useListMessages } from "../../api/list-messages"
import { UserMessage } from "./user-message"
import { AssistantMessage } from "./assistant-message"
import type { ChatMessage } from "../../types/chat"
import { useChatStore } from "../../store/chat-store"


/**
 * MessageView component renders a chat message based on its role.
 */
const MessageView = ({
  chatMessage,
  isLatestUserMessage,
  isLatestAssistantMessage
}: { chatMessage: ChatMessage, isLatestUserMessage: boolean, isLatestAssistantMessage: boolean }) => {
  const isStreaming = useChatStore((state) => state.isStreaming)
  switch (chatMessage.role) {
    case "user":
      return <UserMessage message={chatMessage.content} isLatest={isLatestUserMessage} />
    case "assistant":
      return <AssistantMessage
        message={chatMessage}
        isStreaming={isLatestAssistantMessage && isStreaming}
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

  const { data: messages } = useListMessages({ userId, chatId })

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
      isLatestAssistantMessage={
        (
          message.id === messages[messages.length - 1]?.id
          && message.role === "assistant"
        ) || (
          message.id === messages[messages.length - 2]?.id
          && message.role === "assistant"
        )
      }
    />
  )) || []

  return (
    <>
      <div className='mt-32 flex flex-col items-end space-y-8'>
        {items}
        {/* Placeholder for additional content or spacing */}
        <div className='h-screen'>
        </div>
      </div>
    </>
  )
}