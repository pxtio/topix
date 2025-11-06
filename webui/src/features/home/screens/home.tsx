import { Chat } from "@/features/agent/components/chat-view"
import { Dashboard } from "@/features/board/components/dashboard"
import SubscriptionsPage from "@/features/newsfeed/components/subscriptions-page"

/**
 * HomePage displaying dashboard, chat, and subscriptions.
 */
export const HomePage = () => {
  return (
    <div className="absolute inset h-full w-full min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin">
      <div className="w-full flex flex-col items-center justify-center gap-8 py-8">
        <div className='text-left max-w-[900px] w-full border-b border-border'>
          <h3 className="transition-all text-lg font-medium py-1 px-4">Topics</h3>
        </div>
        <SubscriptionsPage mode="preview" hideTitle />
        <Chat className="relative sm:h-[300px] h-[350px]" />
        <div className='text-left max-w-[900px] w-full border-b border-border'>
          <h3 className="transition-all text-lg font-medium py-1 px-4">Boards</h3>
        </div>
        <Dashboard className="h-auto" hideTitle />
      </div>
    </div>
  )
}