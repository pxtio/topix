// src/components/sidebar/sidebar-label.tsx
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouterState } from "@tanstack/react-router"
import { useAppStore } from "@/store"
import { useListChats } from "@/features/agent/api/list-chats"
import { useListBoards } from "@/features/board/api/list-boards"
import { useUpdateBoard } from "@/features/board/api/update-board"
import { useUpdateChat } from "@/features/agent/api/update-chat"
import { LabelEditor } from "./label-editor"

export const SidebarLabel = () => {
  const { userId } = useAppStore()

  // IMPORTANT: make sure these `from` strings exactly match your route paths.
  // If your board route is '/boards/$id/*', change it below to '/boards/$id/*'.
  const chatParams  = useParams({ from: "/chats/$id",  shouldThrow: false })
  const boardParams = useParams({ from: "/boards/$id", shouldThrow: false }) // or "/boards/$id/*"

  const chatId  = chatParams?.id
  const boardId = boardParams?.id

  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isDashboard = pathname === "/boards"
  const isNewChat = pathname === "/chats"
  const isSubscriptions = pathname === "/subscriptions"

  const active = useMemo(() => {
    if (boardId) return { view: "board" as const, id: boardId }
    if (chatId)  return { view: "chat"  as const, id: chatId }
    if (isNewChat) return { view: "new-chat" as const, id: undefined }
    if (isDashboard) return { view: "dashboard" as const, id: undefined }
    if (isSubscriptions) return { view: "subscriptions" as const, id: undefined }

    return { view: "unknown" as const, id: undefined }
  }, [boardId, chatId, isNewChat, isDashboard, isSubscriptions])

  const { data: chatList }  = useListChats({ userId })
  const { data: boardList } = useListBoards({ userId })
  const { updateBoard } = useUpdateBoard()
  const { updateChat }  = useUpdateChat()

  const [label, setLabel] = useState("")

  // sync local label with current active target
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
      setLabel("")
      return
    }
    if (active.view === "subscriptions") {
      setLabel("")
      return
    }
    setLabel("")
  }, [active.view, active.id, boardList, chatList])

  const handleSaveEdit = (newLabel: string) => {
    setLabel(newLabel)
    if (active.view === "board" && active.id) {
      updateBoard({ boardId: active.id, userId, graphData: { label: newLabel } })
      return
    }
    if (active.view === "chat" && active.id) {
      updateChat({ chatId: active.id, userId, chatData: { label: newLabel } })
      return
    }
    // new-chat or unknown → nothing to persist
  }

  // reset editor when switching targets
  const editorKey = `${active.view}:${active.id ?? "none"}`

  if (active.view === "new-chat") {
    return <div className="text-sm font-medium">New Chat</div>
  }

  if (active.view === "dashboard") {
    return <div className="text-sm font-medium">Dashboard</div>
  }

  if (active.view === "subscriptions") {
    return <div className="text-sm font-medium">Subscriptions</div>
  }

  if (active.view === "chat" || active.view === "board") {
    return (
      <LabelEditor
        key={editorKey}
        initialLabel={label}
        onSave={handleSaveEdit}
      />
    )
  }

  // unknown route → render nothing (or a placeholder)
  return null
}