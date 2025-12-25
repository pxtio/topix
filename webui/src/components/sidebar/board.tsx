import { useCreateBoard } from "@/features/board/api/create-board"
import { SidebarMenuAction, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub } from "../ui/sidebar"
import { useDeleteBoard } from "@/features/board/api/delete-board"
import { trimText } from "@/lib/common"
import { UNTITLED_LABEL } from "@/features/board/const"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../ui/context-menu"
import { HugeiconsIcon } from "@hugeicons/react"
import { DashboardCircleAddIcon, Delete02Icon, Edit01Icon, NoteIcon } from "@hugeicons/core-free-icons"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { Minus, Plus } from "lucide-react"
import { ChatMenuItem, NewChatItem } from "./chat"
import { ConfirmDeleteBoardAlert } from "./confirm-delete-board"
import { useState } from "react"
import { useListChats } from "@/features/agent/api/list-chats"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"

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
  const { createBoardAsync } = useCreateBoard()
  const navigate = useNavigate()

  const handleClick = async () => {
    const newId = await createBoardAsync()
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
export function BoardItem({ boardId, label }: { boardId: string, label?: string }) {
  const { deleteBoard } = useDeleteBoard()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: s => s.location.pathname })

  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const { data: chats = [] } = useListChats({ graphUid: boardId })

  const isActive =
    pathname === `/boards/${boardId}` ||
    pathname.startsWith(`/boards/${boardId}/`)

  const handleClick = () => {
    navigate({ to: "/boards/$id", params: { id: boardId } })
  }

  const handleDelete = () => {
    deleteBoard({ boardId })
    if (isActive) {
      navigate({ to: "/boards" })
    }
  }

  // called when user clicks "Delete Board" in the context menu
  const handleRequestDelete = () => {
    // let the ContextMenu close first (and release its pointer-events stuff),
    // then open the AlertDialog on the next tick
    window.setTimeout(() => {
      setIsConfirmOpen(true)
    }, 0)
  }

  const boardLabel = label || UNTITLED_LABEL
  const boardDisplayLabel = trimText(boardLabel, 20)

  return (
    <SidebarMenuItem>
      <ContextMenu>
        <Collapsible
          defaultOpen={false}
          className="group/collapsible w-full"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <ContextMenuTrigger asChild>
                <SidebarMenuButton
                  onClick={handleClick}
                  className="text-xs font-medium truncate"
                  isActive={isActive}
                >
                  <HugeiconsIcon icon={NoteIcon} className="shrink-0 size-4" strokeWidth={2} />
                  <span>{boardDisplayLabel}</span>
                </SidebarMenuButton>
              </ContextMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" align="center" className="max-w-64">
              <p className="text-xs">{boardLabel}</p>
            </TooltipContent>
          </Tooltip>

          <ContextMenuContent className="w-44">
            <ContextMenuItem
              // let Radix close the menu naturally
              onSelect={() => handleRequestDelete()}
              variant="destructive"
              className="text-xs flex flex-row items-center"
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
            <SidebarMenuAction className="right-1.5">
              <Plus className="group-data-[state=open]/collapsible:hidden" strokeWidth={2} />
              <Minus className="group-data-[state=closed]/collapsible:hidden" strokeWidth={2} />
            </SidebarMenuAction>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <SidebarMenuSub>
              {
                chats?.map(chat => (
                  <ChatMenuItem key={chat.uid} chatId={chat.uid} label={chat.label} />
                )) || []
              }
              <NewChatItem initialBoardId={boardId} isSubMenuItem />
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </ContextMenu>

      {/* Alert lives OUTSIDE the ContextMenu, controlled by state */}
      <ConfirmDeleteBoardAlert
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={() => {
          handleDelete()
          setIsConfirmOpen(false)
        }}
      />
    </SidebarMenuItem>
  )
}
