import { useCreateBoard } from "@/features/board/api/create-board"
import { useAppStore } from "@/store"
import { SidebarMenuAction, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar"
import { Edit2SimpleIcon } from "../icons/edit2"
import { useGraphStore } from "@/features/board/store/graph-store"
import { useDeleteBoard } from "@/features/board/api/delete-board"
import { useGetBoard } from "@/features/board/api/get-board"
import { NoteSimpleIcon } from "../icons/note"
import { trimText } from "@/lib/common"
import { UNTITLED_LABEL } from "@/features/board/const"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"

/**
 * New board item component
 */
export function NewBoardItem() {
  const { userId, setView } = useAppStore()

  const { createBoard } = useCreateBoard()

  const handleClick = () => {
    createBoard({ userId })
    setView("board")  // Switch to board view when creating a new board
  }

  const itemClass = 'text-primary text-xs font-medium transition-all'

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className={itemClass}
        onClick={handleClick}
      >
        <Edit2SimpleIcon className='text-xs shrink-0' strokeWidth={1.75} />
        <span>New Board</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}


/**
 * A board item component
 */
export function BoardItem({ boardId, label }: { boardId: string, label?: string }) {
  const { view, setView, userId } = useAppStore()
  const { boardId: currentBoardId, setBoardId, setNodes, setEdges, setIsLoading } = useGraphStore()

  const { deleteBoard } = useDeleteBoard()

  const { getBoard } = useGetBoard()

  const handleClick = () => {
    setBoardId(boardId)
    setIsLoading(true)
    setNodes([])
    setEdges([])
    setView("board")
    getBoard()
  }

  const isActive = currentBoardId === boardId && view === "board"

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={handleClick}
        className='text-xs font-medium truncate'
        isActive={isActive}
      >
        <NoteSimpleIcon className='shrink-0 size-4' strokeWidth={1.75}/>
        <span>{trimText(label || UNTITLED_LABEL, 20)}</span>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction showOnHover>
            <MoreHorizontal className='size-4' strokeWidth={1.75} />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuItem onClick={() => deleteBoard({ boardId, userId })}>
            <span>Delete Board</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}