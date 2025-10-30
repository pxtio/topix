import { ChatUrl, NewChatUrl } from "@/routes"
import { Chat } from "../components/chat-view"
import { useParams, useSearch } from "@tanstack/react-router"

// Chat screen component
export const ChatScreen = () => {
  const chatParams = useParams({ from: ChatUrl, shouldThrow: false })
  const initialBoardId = useSearch({
    from: NewChatUrl,
    // keeps good types without an assertion
    select: (s: { board_id?: string }) => s.board_id,
    shouldThrow: false
  })

  const chatId = chatParams?.id

  return (
    <>
      <Chat chatId={chatId} initialBoardId={initialBoardId} />
    </>
  )
}