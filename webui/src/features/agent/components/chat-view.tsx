import { ScrollArea } from "@/components/ui/scroll-area"
import { useChatStore } from "../store/chat-store"
import { Conversation } from "./chat/conversation"
import { InputBar } from "./chat/input"

// This is the response focus component
export const ChatView = () => {
  const currentChatId = useChatStore((state) => state.currentChatId)

  return (
    <div className="fixed w-screen h-screen top-0 left-0 z-0">
      <ScrollArea
        className="h-full w-full bg-background"
      >
        <div className='w-full h-full flex flex-col items-center justify-center'>
          <div
            className='h-full sm:max-w-[800px] w-[800px]'
          >
            {
              currentChatId && <Conversation chatId={currentChatId} />
            }

          </div>
        </div>
      </ScrollArea>
      <InputBar />
    </div>
  )
}