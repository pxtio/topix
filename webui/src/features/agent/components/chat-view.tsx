import { ScrollArea } from "@/components/ui/scroll-area"
import { useChatStore } from "../store/chat-store"
import { Conversation } from "./chat/conversation"
import { InputBar } from "./chat/input"
import { useMindMapStore } from "../store/mindmap-store"
import { ProgressBar } from "@/components/progress-bar"
import { ContextBoard } from "./context-board"
import { useListChats } from "../api/list-chats"
import { useAppStore } from "@/store"
import { useUpdateChat } from "../api/update-chat"
import { useState } from "react"


export interface ChatViewProps {
  hideContextBoard?: boolean
}


// This is the response focus component
export const ChatView = ({ hideContextBoard = false }: ChatViewProps) => {
  const [newChatBoardId, setNewChatBoardId] = useState<string | undefined>(undefined)

  const { userId } = useAppStore()

  const { currentChatId } = useChatStore()

  const { data: chatList } = useListChats({ userId })

  const { isProcessing } = useMindMapStore()

  const { updateChat } = useUpdateChat()

  const chat = chatList?.find(chat => chat.uid === currentChatId)

  const updateChatContextBoard = (boardId?: string) => {
    if (currentChatId) {
      updateChat({ chatId: currentChatId, userId, chatData: { graphUid: boardId } })
    } else {
      setNewChatBoardId(boardId)
    }
  }

  const attachedBoardId = currentChatId ? chat?.graphUid : newChatBoardId

  return (
    <div
      className="absolute inset-0 h-full w-full overflow-hidden"
    >
      {
        !hideContextBoard && (
          <div className="absolute top-4 left-4 z-50">
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
        currentChatId && (
          <ScrollArea className='h-full w-full'>
            <div className='w-full h-full flex flex-col items-center justify-center'>
              <div
                className='h-full sm:max-w-[800px] w-[800px]'
              >
                <Conversation chatId={currentChatId} />
              </div>
            </div>
          </ScrollArea>
        )
      }
      <InputBar attachedBoardId={attachedBoardId} />
    </div>
  )
}