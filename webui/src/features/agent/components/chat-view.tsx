import { Conversation } from "./chat/conversation"
import { InputBar } from "./chat/input"
import { useListChats } from "../api/list-chats"
import { ChatProvider, useChat } from "../hooks/chat-context"
import { cn } from "@/lib/utils"
import { useMemo } from "react"
import type { Chat as ChatEntity } from "../types/chat"

type ChatProps = {
  chatId?: string
  initialBoardId?: string
  className?: string
  showHistoricalChats?: boolean
}

const formatChatDate = (value?: string) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric"
  }).format(date)
}

const HistoryList = ({
  chats,
  activeChatId,
  onSelectChat
}: {
  chats: ChatEntity[]
  activeChatId?: string
  onSelectChat: (chatId: string) => void
}) => {
  if (!chats.length) {
    return (
      <div className="w-full max-w-[900px] mx-auto p-4 sm:p-8">
        <div className="text-sm font-medium text-muted-foreground mb-2">Chat History</div>
        <div className="text-sm text-muted-foreground/80 rounded-md border border-dashed border-border px-4 py-6 text-center">
          No chats yet. Start a new one below.
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[900px] mx-auto p-4 sm:p-8">
      <div className="text-sm font-medium text-muted-foreground mb-2">Chat History</div>
      <div className="max-h-64 overflow-y-auto flex flex-col gap-1 pr-1">
        {chats.map(chat => {
          const subtitle = formatChatDate(chat.updatedAt || chat.createdAt)
          const isActive = chat.uid === activeChatId
          return (
            <button
              key={chat.uid}
              onClick={() => onSelectChat(chat.uid)}
              className={cn(
                "text-left rounded-lg border px-3 py-2 transition-colors",
                "hover:border-border hover:bg-accent/40",
                isActive ? "border-border bg-accent/50" : "border-transparent bg-card/60"
              )}
            >
              <div className="text-sm font-medium truncate">{chat.label || "Untitled chat"}</div>
              {subtitle && (
                <div className="text-xs text-muted-foreground">{subtitle}</div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const ChatBody = ({
  initialBoardId,
  className,
  showHistoricalChats = false,
}: ChatProps) => {
  const { chatId, setChatId } = useChat()
  const { data: chatList = [] } = useListChats({ graphUid: initialBoardId })

  const attachedBoardId = useMemo(() => {
    const currentChat = chatList?.find(c => c.uid === chatId)
    return currentChat?.graphUid || initialBoardId
  }, [chatList, chatId, initialBoardId])

  const historicalChats = showHistoricalChats && initialBoardId
    ? chatList
    : []

  const chatClassName = cn(
    "absolute inset-0 h-full w-full overflow-hidden flex flex-col",
    showHistoricalChats ? "gap-4" : "items-center",
    className
  )

  return (
    <div className={chatClassName}>
      {showHistoricalChats && (
        <HistoryList
          chats={historicalChats}
          activeChatId={chatId}
          onSelectChat={setChatId}
        />
      )}

      <div className={cn(
        "flex-1 w-full min-h-0",
        showHistoricalChats ? "flex flex-col items-center" : "flex flex-col"
      )}>
        {chatId ? (
          <div className="w-full min-w-0 h-full p-4 overflow-auto scrollbar-thin">
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div className="w-full max-w-[800px] h-full">
                <Conversation chatId={chatId} />
              </div>
            </div>
          </div>
        ) : (
          showHistoricalChats && (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground px-4 text-center">
              Select a chat from history or start a new conversation below.
            </div>
          )
        )}
      </div>

      <InputBar
        attachedBoardId={attachedBoardId}
        layout={showHistoricalChats ? "docked" : "floating"}
      />
    </div>
  )
}

/**
 * Chat view component
 */
export const Chat = (props: ChatProps) => {
  const { chatId } = props

  return (
    <ChatProvider initialChatId={chatId}>
      <ChatBody {...props} />
    </ChatProvider>
  )
}
