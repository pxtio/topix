import { useEffect, useMemo, useState } from "react"
import { useParams, useRouterState, useSearch, useNavigate } from "@tanstack/react-router"
import { useAppStore } from "@/store"
import { useListChats } from "@/features/agent/api/list-chats"
import { useListBoards } from "@/features/board/api/list-boards"
import { useUpdateBoard } from "@/features/board/api/update-board"
import { useUpdateChat } from "@/features/agent/api/update-chat"
import { LabelEditor } from "./label-editor"
import { useListSubscriptions } from "@/features/newsfeed/api/list-subscriptions"
import { NewChatUrl } from "@/routes"
import { ContextBoard } from "@/features/agent/components/context-board"
import { UNTITLED_LABEL } from "@/features/board/const"

export const SidebarLabel = () => {
  const { userId } = useAppStore()
  const navigate = useNavigate()

  // route params
  const chatParams  = useParams({ from: "/chats/$id", shouldThrow: false })
  const boardParams = useParams({ from: "/boards/$id", shouldThrow: false })
  const subscriptionParams = useParams({ from: "/subscriptions/$id", shouldThrow: false })
  const chatId  = chatParams?.id
  const boardId = boardParams?.id
  const subscriptionId = subscriptionParams?.id

  // new-chat search (?board_id=...)
  const initialBoardId = useSearch({
    from: NewChatUrl,
    select: (s: { board_id?: string }) => s.board_id,
    shouldThrow: false,
  })

  // where are we?
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isHome = pathname === "/"
  const isDashboard = pathname === "/boards"
  const isNewChat = pathname === "/chats"
  const isSubscriptionsRoot = pathname === "/subscriptions"

  const active = useMemo(() => {
    if (boardId) return { view: "board" as const, id: boardId }
    if (chatId)  return { view: "chat"  as const, id: chatId }
    if (subscriptionId) return { view: "subscriptions" as const, id: subscriptionId }
    if (isHome) return { view: "home" as const, id: undefined }
    if (isNewChat) return { view: "new-chat" as const, id: undefined }
    if (isDashboard) return { view: "dashboard" as const, id: undefined }
    if (isSubscriptionsRoot) return { view: "subscriptions" as const, id: undefined }
    return { view: "unknown" as const, id: undefined }
  }, [boardId, chatId, subscriptionId, isNewChat, isDashboard, isSubscriptionsRoot, isHome])

  // data
  const { data: chatList }  = useListChats({ userId })
  const { data: boardList } = useListBoards({ userId })
  const { data: subscriptionList } = useListSubscriptions()
  const { updateBoard } = useUpdateBoard()
  const { updateChat }  = useUpdateChat()

  // title label only (no context local state needed)
  const [label, setLabel] = useState("")

  useEffect(() => {
    if (active.view === "board" && active.id) {
      const b = boardList?.find((x) => x.uid === active.id)
      setLabel(b?.label ?? "")
      return
    }
    if (active.view === "chat" && active.id) {
      const c = chatList?.find((x) => x.uid === active.id)
      setLabel(c?.label ?? "")
      return
    }
    if (active.view === "new-chat") {
      setLabel("New Chat")
      return
    }
    if (active.view === "subscriptions") {
      const c = subscriptionList?.find((s) => s.id === active.id)
      setLabel(c?.label.markdown ?? "Topics")
      return
    }
    setLabel("")
  }, [active.view, active.id, boardList, chatList, subscriptionList])

  const handleSaveEdit = (newLabel: string) => {
    setLabel(newLabel)
    if (active.view === "board" && active.id) {
      updateBoard({ boardId: active.id, userId, graphData: { label: newLabel } })
    }
    if (active.view === "chat" && active.id) {
      updateChat({ chatId: active.id, userId, chatData: { label: newLabel } })
    }
  }

  // 🔑 Single source of truth for the selected board:
  // - existing chat: chat.graphUid
  // - new chat: URL ?board_id
  const currentChat = chatId ? chatList?.find(c => c.uid === chatId) : undefined
  const selectedBoardId =
    active.view === "chat" ? currentChat?.graphUid
    : active.view === "new-chat" ? initialBoardId
    : undefined

  const selectedBoard = selectedBoardId
    ? boardList?.find(b => b.uid === selectedBoardId)
    : undefined

  // When user changes context:
  const handleChangeContext = (nextBoardId?: string) => {
    if (active.view === "chat" && active.id) {
      // persist to API for existing chat
      updateChat({ chatId: active.id, userId, chatData: { graphUid: nextBoardId } })
    } else if (active.view === "new-chat") {
      // persist to URL for new chat (no local state)
      navigate({
        to: NewChatUrl,
        // keep any other search keys you might have
        search: (prev: { board_id?: string; [k: string]: unknown }) =>
          nextBoardId ? { ...prev, board_id: nextBoardId } : { ...prev, board_id: undefined },
        replace: true,
      })
    }
  }

  // navigation helpers for clickable prefix
  const goBoard = (id: string) => navigate({ to: "/boards/$id", params: { id } })
  const goSubscriptionsRoot = () => navigate({ to: "/subscriptions" })

  // UI pieces
  const wrapClass =
    "flex flex-row items-center gap-2 px-2 py-1 text-sm font-medium rounded-md backdrop-blur-md supports-[backdrop-filter]:bg-background/50 bg-transparent"

  const crumbBtn =
    "inline-flex items-center max-w-[16rem] truncate text-foreground/80 hover:text-foreground underline-offset-4 hover:underline"

  const sep = <span className="opacity-50">›</span>

  // HOME
  if (active.view === "home")
    return <div className={wrapClass}>Home</div>

  // DASHBOARD
  if (active.view === "dashboard")
    return <div className={wrapClass}>Dashboard</div>

  // SUBSCRIPTIONS
  if (active.view === "subscriptions") {
    // /subscriptions            -> Subscriptions
    // /subscriptions/$id        -> Subscriptions › Subscription Label
    return (
      <div className={`${wrapClass} flex-1 min-w-0`}>
        <button
          type="button"
          onClick={goSubscriptionsRoot}
          className={`${crumbBtn} font-medium`}
          title="Newsfeed"
        >
          Newsfeed
        </button>
        {active.id && (
          <>
            {sep}
            <span className="truncate max-w-[24rem]" title={label}>{label}</span>
          </>
        )}
      </div>
    )
  }

  // BOARD
  if (active.view === "board" && active.id) {
    return (
      <div className={`${wrapClass} flex-1 min-w-0`}>
        <LabelEditor
          key={`board:${active.id}`}
          initialLabel={label}
          onSave={handleSaveEdit}
        />
      </div>
    )
  }

  // CHAT / NEW CHAT (with optional board prefix)
  if (active.view === "chat" || active.view === "new-chat") {
    const hasBoard = !!selectedBoardId
    return (
      <div className={`${wrapClass} flex-1 min-w-0`}>
        {hasBoard && selectedBoardId && (
          <>
            <button
              type="button"
              onClick={() => goBoard(selectedBoardId)}
              className={crumbBtn}
              title={selectedBoard?.label ?? UNTITLED_LABEL}
            >
              <span className="truncate">{selectedBoard?.label ?? UNTITLED_LABEL}</span>
            </button>
            {sep}
          </>
        )}

        <div className="min-w-0 flex-1">
          {
            active.view === "chat" ? (
              <LabelEditor
                key={`${active.view}:${active.id ?? "none"}`}
                initialLabel={label}
                onSave={handleSaveEdit}
              />
            ) : (
              <span className={`${crumbBtn} mr-2`}>{label}</span>
            )
          }
        </div>

        {(active.view === "chat" || active.view === "new-chat") && (
          <ContextBoard
            contextBoardId={selectedBoardId}
            boardAsContext={handleChangeContext}
          />
        )}
      </div>
    )
  }

  return null
}