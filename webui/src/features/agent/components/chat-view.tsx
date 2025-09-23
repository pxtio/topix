import { Conversation } from "./chat/conversation"
import { InputBar } from "./chat/input"
import { ContextBoard } from "./context-board"
import { useListChats } from "../api/list-chats"
import { useAppStore } from "@/store"
import { useUpdateChat } from "../api/update-chat"
import { useEffect, useState } from "react"
import { ChatProvider } from "../hooks/chat-context"


// Chat view props
export interface ChatViewProps {
  chatId?: string
  hideContextBoard?: boolean
  initialBoardId?: string
}


// This is the response focus component
export const Chat = ({ chatId, hideContextBoard = false, initialBoardId = undefined }: ChatViewProps) => {
  const [newChatBoardId, setNewChatBoardId] = useState<string | undefined>(initialBoardId)

  const { userId } = useAppStore()

  const { data: chatList } = useListChats({ userId })

  const { updateChat } = useUpdateChat()

  const chat = chatList?.find(chat => chat.uid === chatId)

  useEffect(() => {
    setNewChatBoardId(initialBoardId)
  }, [initialBoardId])

  const updateChatContextBoard = (boardId?: string) => {
    if (chatId) {
      updateChat({ chatId, userId, chatData: { graphUid: boardId } })
    } else {
      setNewChatBoardId(boardId)
    }
  }

  const attachedBoardId = chatId ? chat?.graphUid : newChatBoardId

  return (
    <ChatProvider initialChatId={chatId}>
      <div
        className="absolute inset-0 h-full w-full overflow-hidden flex flex-col items-center"
      >
        {
          !hideContextBoard && (
            <div className="absolute z-50 top-0 inset-x-0 p-4 bg-transparent">
              <ContextBoard
                contextBoardId={attachedBoardId}
                boardAsContext={updateChatContextBoard}
              />
            </div>
          )
        }
        {
          chatId && (
            <div className='w-full min-w-0 h-full p-4 pt-16 overflow-auto scrollbar-thin'>
              <div className='w-full h-full flex flex-col items-center justify-center'>
                <div className='w-full max-w-[800px] h-full'>
                  <Conversation chatId={chatId} />
                </div>
              </div>
            </div>
          )
        }
        <InputBar attachedBoardId={attachedBoardId} />
      </div>
    </ChatProvider>
  )
}