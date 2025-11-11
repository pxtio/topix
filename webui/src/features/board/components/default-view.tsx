import { Chat as ChatView } from "@/features/agent/components/chat-view"
import { useGraphStore } from "../store/graph-store"
import { LinearView } from "./flow/linear-view"
import { useAppStore } from "@/store"
import { useListChats } from "@/features/agent/api/list-chats"
import type { Chat } from "@/features/agent/types/chat"
import { HugeiconsIcon } from "@hugeicons/react"
import { Message02Icon, Note05Icon } from "@hugeicons/core-free-icons"


const ChatLine = ({ chat }: { chat: Chat }) => {
  return (
    <div className="transition rounded-md w-full px-3 py-2 hover:bg-accent/50 hover:shadow-sm transition-colors cursor-pointer">
      <div className="text-sm font-medium text-foreground truncate">
        {chat.label || 'Untitled Chat'}
      </div>
    </div>
  )
}


export const DefaultBoardView = () => {
  const userId = useAppStore(state => state.userId)
  const boardId = useGraphStore(state => state.boardId)
  const { data: chats = [] } = useListChats({ userId })

  const boardChats = chats.filter(chat => chat.graphUid === boardId)

  return (
    <div className='absolute inset h-full w-full min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin'>
      <div className="w-full flex flex-col items-center justify-center gap-16 py-8 pb-32">
        <ChatView initialBoardId={boardId} className="relative sm:h-[300px] h-[350px]" />
        <div className='w-full flex flex-col items-center'>
          <div className='text-left max-w-[900px] w-full border-b border-border'>
            <h3 className="transition-all text-lg font-medium py-1 px-4 flex flex-row items-center gap-2">
              <HugeiconsIcon icon={Note05Icon} className='w-5 h-5' strokeWidth={2} />
              <span>Notes</span>
            </h3>
          </div>
          <LinearView cols={3} />
        </div>
        <div className='w-full max-w-[900px] flex flex-col items-center'>
          <h3 className="w-full transition-all text-lg font-medium py-1 px-4 flex flex-row items-center gap-2 border-b border-border">
            <HugeiconsIcon icon={Message02Icon} className='w-5 h-5' strokeWidth={2} />
            <span>Chats</span>
          </h3>
          <div className='w-full flex flex-col gap-1 p-2'>
            {
              boardChats.map(chat => (
                <ChatLine key={chat.id} chat={chat} />
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}