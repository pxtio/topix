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
import { CancelIcon, CheckmarkCircle03Icon, GitForkIcon, NotebookIcon, ReloadIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useNavigate } from "@tanstack/react-router"
import clsx from "clsx"
import { useState } from "react"
import { toast } from "sonner"


// Spinner icon for loading state
const LoadingIcon = () => <HugeiconsIcon
  icon={ReloadIcon}
  className="text-accent-foreground size-4 animate-spin [animation-duration:750ms]"
  strokeWidth={1.75}
/>

const SuccessIcon = () => <HugeiconsIcon
  icon={CheckmarkCircle03Icon}
  className="text-foreground size-4"
  strokeWidth={1.75}
/>

const ErrorIcon = () => <HugeiconsIcon
  icon={CancelIcon}
  className="text-destructive size-4"
  strokeWidth={1.75}
/>


// Button that generates a mind map from the given message.
export const SaveAsNote = ({ message, type }: { message: string, type: "notify" | "mapify" }) => {
  const [processing, setProcessing] = useState<boolean>(false)

  const { chatId } = useChat()
  const { userId } = useAppStore()

  const { convertToMindMapAsync } = useConvertToMindMap()
  const { data: boardList } = useListBoards({ userId })
  const { data: chatList } = useListChats({ userId })
  const { createBoardAsync } = useCreateBoard()

  const navigate = useNavigate()

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
  const launchGeneration = async (boardId: string) => {
    if (!ensureMessage()) return
    if (processing) return

    setProcessing(true)
    const id = toast("Rewriting…", {
      icon: <LoadingIcon />,
      duration: Infinity
    })
    try {
      await convertToMindMapAsync({
        boardId,
        answer: message,
        toolType: type
      })
      toast.success("Notes updated.", {
        id,
        icon: <SuccessIcon />,
        duration: undefined,
        action: {
          label: "Go to board",
          onClick: () => {
            navigate({ to: '/boards/$id', params: { id: boardId } })
          }
        }
      })
    } catch (error) {
      console.error("Error converting to mind map:", error)
      toast.error("Failed to rewrite.", {
        id,
        icon: <ErrorIcon />,
        duration: undefined
      })
    } finally {
      setProcessing(false)
    }
  }

  // Create a new board, then generate — one toast sequence for the whole flow
  const createAndLaunch = async () => {
    if (!ensureMessage()) return
    if (processing) return

    setProcessing(true)
    const id = toast(
      "Creating board and rewriting…",
      {
        icon: <LoadingIcon />,
        duration: Infinity
      }
    )
    try {
      const boardId = await createBoardAsync({ userId })
      await convertToMindMapAsync({ boardId, answer: message, toolType: type})
      toast.success(
        "Notes updated.",
        {
          id,
          icon: <SuccessIcon />,
          duration: undefined,
          action: {
            label: "Go to board",
            onClick: () => {
              navigate({ to: '/boards/$id', params: { id: boardId } })
            }
          }
        }
      )
    } catch (error) {
      console.error("Error creating board or converting to mind map:", error)
      toast.error(
        "Could not create the board or rewrite.",
        {
          id,
          icon: <ErrorIcon />,
          duration: undefined
        })
    } finally {
      setProcessing(false)
    }
  }

  const label = type === "notify" ? "Notify" : "Mapify"
  const icon = type === "notify" ? NotebookIcon : GitForkIcon

  const buttonClass = clsx(
    "transition-all text-xs text-muted-foreground/75 hover:text-foreground flex flex-row items-center gap-2 p-1 rounded-md",
    processing && "opacity-75 pointer-events-none"
  )

  const iconCpn = processing ?
    <LoadingIcon /> :
    <HugeiconsIcon icon={icon} className="text-primary size-4" />

  return (
    <>
      {!attachedBoardId ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={buttonClass}
              aria-label={label}
              title={label}
            >
              {iconCpn}
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
            <button
              className={buttonClass}
              onClick={() => launchGeneration(attachedBoardId)}
            >
              {iconCpn}
              <span>{label}</span>
            </button>
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