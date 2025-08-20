import { ChatUrl } from "@/router"
import { Chat } from "../components/chat-view"
import { useParams } from "@tanstack/react-router"

export const ChatScreen = () => {
  const chatParams = useParams({ from: ChatUrl, shouldThrow: false })

  const chatId = chatParams?.id

  return (
    <>
      <Chat chatId={chatId} />
    </>
  )
}