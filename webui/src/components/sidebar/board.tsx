import { useCreateBoard } from "@/features/board/api/create-board"
import { useAppStore } from "@/store"
import { SidebarMenuAction, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub } from "../ui/sidebar"
import { useDeleteBoard } from "@/features/board/api/delete-board"
import { trimText } from "@/lib/common"
import { UNTITLED_LABEL } from "@/features/board/const"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../ui/context-menu"
import { HugeiconsIcon } from "@hugeicons/react"
import { DashboardCircleAddIcon, Delete02Icon, Edit01Icon, NoteIcon } from "@hugeicons/core-free-icons"
import type { Chat } from "@/features/agent/types/chat"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { Minus, Plus } from "lucide-react"
import { ChatMenuItem, NewChatItem } from "./chat"

/**
 * Dashboard menu item component
 */
export function DashboardMenuItem() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const isActive = pathname === `/boards`

  const handleClick = () => {
    navigate({ to: '/boards' })
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={handleClick}
        className="text-xs font-medium truncate"
        isActive={isActive}
      >
        <HugeiconsIcon icon={DashboardCircleAddIcon} className="shrink-0 size-4 text-sidebar-icon-2" strokeWidth={2} />
        <span>Dashboard</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

/**
 * New board item component
 */
export function NewBoardItem() {
  const { userId } = useAppStore()
  const { createBoardAsync } = useCreateBoard()
  const navigate = useNavigate()

  const handleClick = async () => {
    const newId = await createBoardAsync({ userId })
    // Go to /boards/:id (no page refresh)
    navigate({ to: '/boards/$id', params: { id: newId } })
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton className="text-xs text-secondary font-medium transition-all" onClick={handleClick}>
        <HugeiconsIcon icon={Edit01Icon} className="text-xs shrink-0 text-sidebar-icon-1" strokeWidth={2} />
        <span>New Board</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}


/** Existing board item */
export function BoardItem({ boardId, label, chats }: { boardId: string, label?: string, chats?: Chat[] }) {
  const { userId } = useAppStore()
  const { deleteBoard } = useDeleteBoard()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const isActive = pathname === `/boards/${boardId}` || pathname.startsWith(`/boards/${boardId}/`)

  const handleClick = () => {
    navigate({ to: '/boards/$id', params: { id: boardId } })
  }

  const handleDelete = () => {
    deleteBoard({ boardId, userId })
    if (isActive) {
      navigate({ to: '/boards' })
    }
  }

  return (
    <SidebarMenuItem>
      <ContextMenu>
        <Collapsible
          defaultOpen={false}
          className="group/collapsible w-full"
        >
          <ContextMenuTrigger asChild>
            <SidebarMenuButton
              onClick={handleClick}
              className="text-xs font-medium truncate"
              isActive={isActive}
            >
              <HugeiconsIcon icon={NoteIcon} className="shrink-0 size-4" strokeWidth={2} />
              <span>{trimText(label || UNTITLED_LABEL, 20)}</span>
            </SidebarMenuButton>
          </ContextMenuTrigger>
          <ContextMenuContent className='w-44'>
            <ContextMenuItem
              onClick={handleDelete}
              variant="destructive"
              className='text-xs flex flex-row items-center'
            >
              <HugeiconsIcon
                icon={Delete02Icon}
                className="mr-2 size-4"
                strokeWidth={2}
              />
              <span>Delete Board</span>
            </ContextMenuItem>
          </ContextMenuContent>

          <CollapsibleTrigger asChild>
            <SidebarMenuAction className='right-1.5'>
              <Plus className="group-data-[state=open]/collapsible:hidden" strokeWidth={2} />
              <Minus className="group-data-[state=closed]/collapsible:hidden" strokeWidth={2} />
            </SidebarMenuAction>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {
                chats?.map((chat) => <ChatMenuItem key={chat.uid} chatId={chat.uid} label={chat.label} />) || []
              }
              <NewChatItem initialBoardId={boardId} isSubMenuItem />
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </ContextMenu>
    </SidebarMenuItem>
  )
}