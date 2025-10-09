import { useChat } from "@/features/agent/hooks/chat-context"
import { CopyAnswer } from "./copy-answer"
import { SaveAsNote } from "./save-as-note"
import { useListChats } from "@/features/agent/api/list-chats"
import { useAppStore } from "@/store"


/**
 * Component that renders action buttons for a chat response.
 */
export const ResponseActions = ({ message, saveAsIs = false }: { message: string, saveAsIs?: boolean }) => {
  const userId = useAppStore(state => state.userId)

  const { chatId } = useChat()

  const { data: chatList } = useListChats({ userId })

  const chat = chatList?.find((c) => c.uid === chatId)
  const attachedBoardId = chat?.graphUid
  return (
    <div className="flex flex-row items-center gap-2">
      <CopyAnswer answer={message} />
      <SaveAsNote message={message} type="notify" saveAsIs={saveAsIs} boardId={attachedBoardId} />
      <SaveAsNote message={message} type="mapify" saveAsIs={saveAsIs} boardId={attachedBoardId} />
    </div>
  )
}