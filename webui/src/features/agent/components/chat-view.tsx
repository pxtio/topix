import { Conversation } from "./chat/conversation"
import { InputBar } from "./chat/input"
import { useAppStore } from "@/store"
import { useListChats } from "../api/list-chats"
import { ChatProvider } from "../hooks/chat-context"

/**
 * Chat view component
 */
export const Chat = ({ chatId }: { chatId?: string }) => {
  const { userId } = useAppStore()

  const { data: chatList } = useListChats({ userId })

  const chat = chatList?.find(c => c.uid === chatId)
  const attachedBoardId = chat?.graphUid

  return (
    <ChatProvider initialChatId={chatId}>
      <div className="absolute inset-0 h-full w-full overflow-hidden flex flex-col items-center">
        {chatId && (
          <div className="w-full min-w-0 h-full p-4 overflow-auto scrollbar-thin">
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div className="w-full max-w-[800px] h-full">
                <Conversation chatId={chatId} />
              </div>
            </div>
          </div>
        )}
        <InputBar attachedBoardId={attachedBoardId} />
      </div>
    </ChatProvider>
  )
}
