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
        <SubscriptionsPage mode="preview" />
        <Chat className="relative h-[250px]" />
        <Dashboard className="h-auto" />
      </div>
    </div>
  )
}