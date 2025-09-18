import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { useListBoards } from "@/features/board/api/list-boards"
import { UNTITLED_LABEL } from "@/features/board/const"
import { useAppStore } from "@/store"
import { HugeiconsIcon } from '@hugeicons/react'
import { AiChipIcon } from '@hugeicons/core-free-icons'


// Props for the context board selector
export interface ContextBoardProps {
  contextBoardId?: string
  boardAsContext: (boardId?: string) => void
}


/**
 * Context board selector component in chat interface
 */
export const ContextBoard = ({ contextBoardId, boardAsContext }: ContextBoardProps) => {
  const { userId } = useAppStore()
  const { data: boards } = useListBoards({ userId })

  const handleSelectBoard = (boardId: string) => {
    if (boardId === "-1") {
      boardAsContext(undefined)
    } else {
      boardAsContext(boardId)
    }
  }

  if (!boards) return null

  const value = contextBoardId ? contextBoardId : "-1"

  const label = contextBoardId ? boards.find(board => board.uid === contextBoardId)?.label || UNTITLED_LABEL : "Select Context"

  return (
    <Select value={value} onValueChange={handleSelectBoard}>
      <SelectTrigger className='border border-border rounded-lg bg-card text-xs font-medium backdrop-blur-md supports-[backdrop-filter]:bg-sidebar/50'>
        <HugeiconsIcon
          icon={AiChipIcon}
        />
        <span>{label}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={"-1"}>
          No Context
        </SelectItem>
        {boards.map((board) => (
          <SelectItem key={board.uid} value={board.uid}>
            {board.label || UNTITLED_LABEL}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
