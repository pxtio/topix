import { useAppStore } from "@/store"
import { useListMessages } from "../../api/list-messages"
import { UserMessage } from "./user-message"
import { AssistantMessage } from "./assistant-message"
import type { ChatMessage } from "../../types/chat"


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

  const { data: messages } = useListMessages({ userId, chatId })

  if (!messages) return null

  const userMessages = messages?.filter((m) => m.role === "user")
  const lastUserMessageId = userMessages?.at(-1)?.id

  const items = messages?.map((message) => (
    <MessageView
      key={message.id}
      chatMessage={message}
      isLatestUserMessage={message.id === lastUserMessageId}
    />
  )) || []

  return (
    <>
      <div className='mt-32 flex flex-col items-end space-y-8'>
        {items}
        <div className='h-screen'>
        </div>
      </div>
    </>
  )
}