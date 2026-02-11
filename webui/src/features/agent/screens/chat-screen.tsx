import { ChatUrl, NewChatUrl } from "@/routes"
import { Chat } from "../components/chat-view"
import { useParams, useSearch } from "@tanstack/react-router"

// Chat screen component
export const ChatScreen = () => {
  const chatParams = useParams({ from: ChatUrl, shouldThrow: false })
  const newChatBoardId = useSearch({
    from: NewChatUrl,
    select: (s: { board_id?: string }) => s.board_id,
    shouldThrow: false
  })
  const existingChatBoardId = useSearch({
    from: ChatUrl,
    select: (s: { board_id?: string }) => s.board_id,
    shouldThrow: false
  })

  const initialBoardId = existingChatBoardId ?? newChatBoardId

  const chatId = chatParams?.id

  return (
    <>
      <Chat chatId={chatId} initialBoardId={initialBoardId} />
    </>
  )
}
