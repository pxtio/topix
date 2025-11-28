import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { useListBoards } from "@/features/board/api/list-boards"
import { useUpdateChat } from "@/features/agent/api/update-chat"
import { useAppStore } from "@/store"
import { useParams } from "@tanstack/react-router"
import { UNTITLED_LABEL } from "@/features/board/const"
import { HugeiconsIcon } from "@hugeicons/react"
import { AiChipIcon, PlusSignIcon } from "@hugeicons/core-free-icons"


export interface ContextBoardProps {
  /** optional — if provided, ContextBoard is stateless */
  contextBoardId?: string
  /** callback used when parent controls the update */
  boardAsContext?: (boardId?: string) => void
}


/**
 * Context board selector component in chat interface
 */
export const ContextBoard = ({ contextBoardId, boardAsContext }: ContextBoardProps) => {
  const { userId } = useAppStore()
  const { data: boards } = useListBoards()
  const { updateChat } = useUpdateChat()
  const params = useParams({ from: "/chats/$id", shouldThrow: false })
  const chatId = params?.id

  if (!boards) return null

  const attachedId = contextBoardId
  const value = attachedId ?? "-1"
  const label = attachedId
    ? boards.find((b) => b.uid === attachedId)?.label || UNTITLED_LABEL
    : "Add Context"

  const handleSelectBoard = (boardId: string) => {
    const finalId = boardId === "-1" ? undefined : boardId

    // If parent provided a handler → use it
    if (boardAsContext) {
      boardAsContext(finalId)
      return
    }

    // Otherwise, auto-handle for chat route
    if (chatId && userId) {
      updateChat({ chatId, userId, chatData: { graphUid: finalId } })
    }
  }

  const icon = attachedId ? AiChipIcon : PlusSignIcon

  return (
    <Select value={value} onValueChange={handleSelectBoard}>
      <SelectTrigger
        className="rounded-full border bg-card/60 text-xs font-medium backdrop-blur-md supports-[backdrop-filter]:bg-sidebar/50 px-2 py-1 gap-2 !h-8 text-secondary shadow-sm"
        size='sm'
      >
        <HugeiconsIcon icon={icon} className="size-4 shrink-0 text-secondary my-icon" strokeWidth={2} />
        <span>{label}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="-1">No Context</SelectItem>
        {boards.map((b) => (
          <SelectItem key={b.uid} value={b.uid}>
            {b.label || UNTITLED_LABEL}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}