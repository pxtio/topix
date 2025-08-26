import { ScrollArea } from "@/components/ui/scroll-area"
import { Conversation } from "./chat/conversation"
import { InputBar } from "./chat/input"
import { useMindMapStore } from "../store/mindmap-store"
import { ProgressBar } from "@/components/progress-bar"
import { ContextBoard } from "./context-board"
import { useListChats } from "../api/list-chats"
import { useAppStore } from "@/store"
import { useUpdateChat } from "../api/update-chat"
import { useState } from "react"
import { ChatProvider } from "../hooks/chat-context"


export interface ChatViewProps {
  chatId?: string
  hideContextBoard?: boolean
}


// This is the response focus component
export const Chat = ({ chatId, hideContextBoard = false }: ChatViewProps) => {
  const [newChatBoardId, setNewChatBoardId] = useState<string | undefined>(undefined)

  const { userId } = useAppStore()

  const { data: chatList } = useListChats({ userId })

  const { isProcessing } = useMindMapStore()

  const { updateChat } = useUpdateChat()

  const chat = chatList?.find(chat => chat.uid === chatId)

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
        className="flex flex-col inset-0 h-full w-full lg:w-8/10 items-center overflow-hidden"
      >
        {
          !hideContextBoard && (
            <div className="flex self-start z-50">
              <ContextBoard
                contextBoardId={attachedBoardId}
                boardAsContext={updateChatContextBoard}
              />
            </div>
          )
        }
        {
          isProcessing &&
          <div className="absolute inset-0 bg-transparent flex items-center justify-center">
            <ProgressBar
              message="Mapifying"
              viewMode="compact"
            />
          </div>
        }
        {
          chatId && (
            <ScrollArea className='max-h-8/10 w-full'>
              <div className='w-full h-full flex flex-col items-center justify-center'>
                <div
                  className='h-full w-full'
                >
                  <Conversation chatId={chatId} />
                </div>
              </div>
            </ScrollArea>
          )
        }
        <InputBar attachedBoardId={attachedBoardId} />
      </div>
    </ChatProvider>
  )
}