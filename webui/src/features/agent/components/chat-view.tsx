import { Conversation } from "./chat/conversation"
import { InputBar } from "./chat/input"
import { useListChats } from "../api/list-chats"
import { ChatProvider, useChat } from "../hooks/chat-context"
import { cn } from "@/lib/utils"
import { useMemo } from "react"
import type { Chat as ChatEntity } from "../types/chat"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { HugeiconsIcon } from "@hugeicons/react"
import { Clock02Icon, Message02Icon, PlusSignIcon } from "@hugeicons/core-free-icons"
import { ThemedWelcome } from "./chat/welcome-message"
import { useNavigate, useParams, useRouterState } from "@tanstack/react-router"

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
  onSelectChat,
  onNewChat,
  variant
}: {
  chats: ChatEntity[]
  activeChatId?: string
  onSelectChat: (chatId: string) => void
  onNewChat: () => void
  variant: "inline" | "dropdown"
}) => {
  if (variant === "dropdown") {
    return (
      <div className="absolute top-0 w-full flex justify-start px-4 py-2 sm:px-8 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full border border-border shadow-sm bg-accent hover:bg-background transition-colors"
            >
              <HugeiconsIcon icon={Message02Icon} className="size-4" strokeWidth={2} />
              <span className="sr-only">Open chat history</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72 max-h-80 overflow-y-auto">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide flex flex-row items-center gap-0">
              <HugeiconsIcon icon={Clock02Icon} className="size-4 mr-2 inline-block" strokeWidth={2} />
              <span>Chat History</span>
            </div>
            {chats.length ? (
              chats.map(chat => {
                const subtitle = formatChatDate(chat.updatedAt || chat.createdAt)
                const isActive = chat.uid === activeChatId
                return (
                  <DropdownMenuItem
                    key={chat.uid}
                    onSelect={() => onSelectChat(chat.uid)}
                    className={cn(
                      "flex flex-col items-start gap-0.5",
                      isActive && "bg-accent/40"
                    )}
                  >
                    <span className="text-sm font-medium truncate">{chat.label || "Untitled chat"}</span>
                    {subtitle && (
                      <span className="text-xs text-muted-foreground">{subtitle}</span>
                    )}
                  </DropdownMenuItem>
                )
              })
            ) : (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No chats yet.
              </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={onNewChat}
              className="text-sm font-medium text-primary cursor-pointer flex flex-row items-center gap-0"
            >
              <HugeiconsIcon icon={PlusSignIcon} className="size-4 mr-2" strokeWidth={2} />
              <span>Create new chat</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[900px] mx-auto p-4 sm:p-8">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-muted-foreground flex flex-row items-center gap-0">
          <HugeiconsIcon icon={Clock02Icon} className="size-4 mr-2 inline-block" strokeWidth={2} />
          <span>Chat History</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onNewChat} className="flex flex-row items-center gap-0">
          <HugeiconsIcon icon={PlusSignIcon} className="size-4 mr-2" strokeWidth={2} />
          <span>New Chat</span>
        </Button>
      </div>
      {chats.length ? (
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
      ) : (
        <div className="text-sm text-muted-foreground/80 rounded-md border border-dashed border-border px-4 py-6 text-center">
          No chats yet. Start a new one below.
        </div>
      )}
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
  const navigate = useNavigate()
  const routerLocation = useRouterState({ select: (s) => s.location })
  const boardParams = useParams({ from: "/boards/$id", shouldThrow: false })

  const attachedBoardId = useMemo(() => {
    const currentChat = chatList?.find(c => c.uid === chatId)
    return currentChat?.graphUid || initialBoardId
  }, [chatList, chatId, initialBoardId])

  const historicalChats = showHistoricalChats && initialBoardId
    ? chatList
    : []

  const historyVariant: "inline" | "dropdown" =
    showHistoricalChats && chatId ? "dropdown" : "inline"

  const chatClassName = cn(
    "absolute inset-0 h-full w-full overflow-hidden flex flex-col",
    showHistoricalChats ? "gap-4" : "items-center",
    className
  )

  const isBoardRoute = routerLocation.pathname?.startsWith("/boards/")
  const boardRouteId = boardParams?.id ?? initialBoardId

  const syncBoardUrl = (nextChatId?: string) => {
    if (!isBoardRoute || !boardRouteId) return
    navigate({
      to: "/boards/$id",
      params: { id: boardRouteId },
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        current_chat_id: nextChatId || undefined,
      }),
    })
  }

  return (
    <div className={chatClassName}>
      {showHistoricalChats && (
        <HistoryList
          chats={historicalChats}
          activeChatId={chatId}
          onSelectChat={(id) => {
            setChatId(id)
            syncBoardUrl(id)
          }}
          onNewChat={() => {
            setChatId(undefined)
            syncBoardUrl(undefined)
          }}
          variant={historyVariant}
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
            <div className="flex flex-1 w-full items-center justify-center text-sm text-muted-foreground px-4 text-center">
              <ThemedWelcome
                name="Panda"
                message={"Select a chat from history or start a new conversation below."}
              />
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
