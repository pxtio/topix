import { Chat } from "@/features/agent/components/chat-view"
import { Dashboard } from "@/features/board/components/dashboard"
import SubscriptionsPage from "@/features/newsfeed/components/subscriptions-page"

/**
 * HomePage displaying dashboard, chat, and subscriptions.
 */
export const HomePage = () => {
  return (
    <div className="absolute inset h-full w-full min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin">
      <div className="w-full flex flex-col items-center justify-center gap-12 py-8">
        <div className='text-center'>
          <h3 className="transition-all text-lg font-medium py-1 px-4 border-b border-border">Topics</h3>
        </div>
        <SubscriptionsPage mode="preview" hideTitle />
        <Chat className="relative h-[300px]" />
        <div className='text-center'>
          <h3 className="transition-all text-lg font-medium py-1 px-4 border-b border-border">Boards</h3>
        </div>
        <Dashboard className="h-auto" hideTitle />
      </div>
    </div>
  )
}