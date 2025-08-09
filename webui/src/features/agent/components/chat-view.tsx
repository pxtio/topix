import { ScrollArea } from "@/components/ui/scroll-area"
import { useChatStore } from "../store/chat-store"
import { Conversation } from "./chat/conversation"
import { InputBar } from "./chat/input"
import { useMindMapStore } from "../store/mindmap-store"
import { ProgressBar } from "@/components/progress-bar"

// This is the response focus component
export const ChatView = () => {
  const currentChatId = useChatStore((state) => state.currentChatId)
  const { isProcessing } = useMindMapStore()

  return (
    <>
      <div
        className="absolute inset-0 h-full w-full overflow-hidden"
      >
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
        <InputBar />
      </div>
    </>
  )
}