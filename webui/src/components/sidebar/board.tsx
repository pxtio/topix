import { useCreateBoard } from "@/features/board/api/create-board"
import { useAppStore } from "@/store"
import { SidebarMenuAction, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar"
import { Edit2SimpleIcon } from "../icons/edit2"
import { useDeleteBoard } from "@/features/board/api/delete-board"
import { NoteSimpleIcon } from "../icons/note"
import { trimText } from "@/lib/common"
import { UNTITLED_LABEL } from "@/features/board/const"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { useNavigate, useRouterState } from "@tanstack/react-router"

/**
 * New board item component
 */
export function NewBoardItem() {
  const { userId, setView } = useAppStore()
  const { createBoardAsync } = useCreateBoard()
  const navigate = useNavigate()

  const handleClick = async () => {
    const newId = await createBoardAsync({ userId })
    setView('board')
    // Go to /boards/:id (no page refresh)
    navigate({ to: '/boards/$id', params: { id: newId } })
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton className="text-primary text-xs font-medium transition-all" onClick={handleClick}>
        <Edit2SimpleIcon className="text-xs shrink-0" strokeWidth={1.75} />
        <span>New Board</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}


/** Existing board item */
export function BoardItem({ boardId, label }: { boardId: string; label?: string }) {
  const { userId } = useAppStore()
  const { deleteBoard } = useDeleteBoard()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const isActive = pathname === `/boards/${boardId}` || pathname.startsWith(`/boards/${boardId}/`)

  const handleClick = () => {
    navigate({ to: '/boards/$id', params: { id: boardId } })
  }

  const handleDelete = () => deleteBoard({ boardId, userId })

  return (
    <SidebarMenuItem>
      <SidebarMenuButton onClick={handleClick} className="text-xs font-medium truncate" isActive={isActive}>
        <NoteSimpleIcon className="shrink-0 size-4" strokeWidth={1.75} />
        <span>{trimText(label || UNTITLED_LABEL, 20)}</span>
      </SidebarMenuButton>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction showOnHover>
            <MoreHorizontal className="size-4" strokeWidth={1.75} />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuItem onClick={handleDelete}>
            <span>Delete Board</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}