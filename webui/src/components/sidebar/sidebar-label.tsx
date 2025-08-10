import { useAppStore } from "@/store"
import { useGraphStore } from "@/features/board/store/graph-store"
import { useChatStore } from "@/features/agent/store/chat-store"
import { useUpdateBoard } from "@/features/board/api/update-board"
import { useUpdateChat } from "@/features/agent/api/update-chat"
import { useListChats } from "@/features/agent/api/list-chats"
import { useListBoards } from "@/features/board/api/list-boards"
import { useEffect, useState } from "react"
import { LabelEditor } from "./label-editor"


export const SidebarLabel = () => {
  const [label, setLabel] = useState<string>("")
  const { userId, view } = useAppStore()

  const { boardId } = useGraphStore()

  const { currentChatId } = useChatStore()

  const { updateBoard } = useUpdateBoard()

  const { updateChat } = useUpdateChat()

  const { data: chatList } = useListChats({ userId })

  const { data: boardList } = useListBoards({ userId })

  useEffect(() => {
    if (view == 'board') {
      if (boardId) {
        const board = boardList?.find(b => b.id === boardId)
        setLabel(board?.label || "")
      }
    } else {
      if (currentChatId) {
        const chat = chatList?.find(c => c.uid === currentChatId)
        setLabel(chat?.label || "")
      }
    }
  }, [boardId, boardList, chatList, currentChatId, view])

  const handleSaveEdit = (label: string) => {
    if (view == 'board') {
      if (boardId) {
        setLabel(label)
        updateBoard({ boardId, userId, graphData: { label } })
      }
    } else {
      if (currentChatId) {
        setLabel(label)
        updateChat({ chatId: currentChatId, userId, chatData: { label } })
      }
    }
  }

  return (
    <>
      {
        !(currentChatId === undefined && view === 'chat') ?
        <LabelEditor initialLabel={label} onSave={handleSaveEdit} />
        :
        <div className="text-sm font-medium">
          <span>New Chat</span>
        </div>
      }
    </>
  )
}