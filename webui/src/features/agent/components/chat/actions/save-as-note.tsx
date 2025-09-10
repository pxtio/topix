import { Button } from "@/components/ui/button"
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel,
  ContextMenuSeparator, ContextMenuTrigger
} from "@/components/ui/context-menu"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useListChats } from "@/features/agent/api/list-chats"
import { useChat } from "@/features/agent/hooks/chat-context"
import { useConvertToMindMap } from "@/features/board/api/convert-to-mindmap"
import { useCreateBoard } from "@/features/board/api/create-board"
import { useListBoards } from "@/features/board/api/list-boards"
import { UNTITLED_LABEL } from "@/features/board/const"
import { useAppStore } from "@/store"
import { GitForkIcon, NotebookIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"


// Button that generates a mind map from the given message.
export const SaveAsNote = ({ message, type }: { message: string, type: "notify" | "mapify" }) => {
  const { chatId } = useChat()
  const { userId } = useAppStore()

  const { convertToMindMapAsync } = useConvertToMindMap()
  const { data: boardList } = useListBoards({ userId })
  const { data: chatList } = useListChats({ userId })
  const { createBoardAsync } = useCreateBoard()

  const chat = chatList?.find((c) => c.uid === chatId)
  const attachedBoardId = chat?.graphUid

  const ensureMessage = () => {
    if (!message.trim()) {
      toast.error("No message to convert!")
      return false
    }
    return true
  }

  // Launch on an existing board, with loading/success/error toasts
  const launchGeneration = (boardId: string) => {
    if (!ensureMessage()) return

    const promise = convertToMindMapAsync({
      boardId,
      answer: message,
      toolType: type
    })

    toast.promise(promise, {
      loading: "Rewriting…",
      success: "Notes updated.",
      error: "Failed to rewrite.",
    })
  }

  // Create a new board, then generate — one toast sequence for the whole flow
  const createAndLaunch = () => {
    if (!ensureMessage()) return

    const promise = (async () => {
      const boardId = await createBoardAsync({ userId })
      await convertToMindMapAsync({ boardId, answer: message, toolType: type})
    })()

    toast.promise(promise, {
      loading: "Creating board and rewriting…",
      success: "Notes updated.",
      error: "Could not create the board or rewrite.",
    })
  }

  const label = type === "notify" ? "Notify" : "Mapify"
  const icon = type === "notify" ? NotebookIcon : GitForkIcon

  return (
    <>
      {!attachedBoardId ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="transition-all text-xs text-muted-foreground/50 hover:text-foreground flex flex-row items-center gap-2 p-1 rounded-md"
              aria-label={label}
              title={label}
            >
              <HugeiconsIcon icon={icon} className="text-primary size-4" strokeWidth={1.75} />
              <span>{label}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48">
            <DropdownMenuLabel>Boards</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="bg-accent/50" onClick={createAndLaunch}>
              <span>Create New Board</span>
            </DropdownMenuItem>
            {boardList?.map((board) => (
              <DropdownMenuItem key={board.uid} onClick={() => launchGeneration(board.uid)}>
                {board.label || UNTITLED_LABEL}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <Button
              variant={null}
              className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted flex flex-row items-center gap-2"
              onClick={() => launchGeneration(attachedBoardId)}
            >
              <HugeiconsIcon icon={NotebookIcon} className="text-primary size-4" />
              <span>Mapify</span>
            </Button>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            <ContextMenuLabel>Select a different board</ContextMenuLabel>
            <ContextMenuSeparator />
            <ContextMenuItem className="bg-accent/50" onClick={createAndLaunch}>
              <span>Create New Board</span>
            </ContextMenuItem>
            {boardList?.map((board) => (
              <ContextMenuItem key={board.uid} onClick={() => launchGeneration(board.uid)}>
                {board.label || UNTITLED_LABEL}
              </ContextMenuItem>
            ))}
          </ContextMenuContent>
        </ContextMenu>
      )}
    </>
  )
}