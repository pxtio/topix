import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel,
  ContextMenuSeparator, ContextMenuTrigger
} from "@/components/ui/context-menu"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useConvertToMindMap } from "@/features/board/api/convert-to-mindmap"
import { useCreateBoard } from "@/features/board/api/create-board"
import { useListBoards } from "@/features/board/api/list-boards"
import { UNTITLED_LABEL } from "@/features/board/const"
import { CancelIcon, ChartBubbleIcon, CheckmarkCircle03Icon, GitForkIcon, NotebookIcon, ReloadIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useNavigate } from "@tanstack/react-router"
import clsx from "clsx"
import { useState } from "react"
import { toast } from "sonner"


// Spinner icon for loading state
const LoadingIcon = () => <HugeiconsIcon
  icon={ReloadIcon}
  className="size-4 animate-spin [animation-duration:750ms]"
  strokeWidth={2}
/>

const SuccessIcon = () => <HugeiconsIcon
  icon={CheckmarkCircle03Icon}
  className="text-foreground size-4"
  strokeWidth={2}
/>

const ErrorIcon = () => <HugeiconsIcon
  icon={CancelIcon}
  className="text-destructive size-4"
  strokeWidth={2}
/>


export interface SaveAsNoteProps {
  message: string
  type: "notify" | "mapify" | "schemify"
  saveAsIs?: boolean
  boardId?: string
  useAnchors?: boolean
}


// Button that generates a mind map from the given message.
export const SaveAsNote = ({
  message,
  type,
  saveAsIs = false,
  boardId,
  useAnchors = false,
}: SaveAsNoteProps) => {
  const [processing, setProcessing] = useState<boolean>(false)

  const { convertToMindMapAsync } = useConvertToMindMap()
  const { data: boardList } = useListBoards()
  const { createBoardAsync } = useCreateBoard()

  const navigate = useNavigate()

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
    const startedAt = Date.now()
    const formatElapsed = () => `${Math.max(0, Math.floor((Date.now() - startedAt) / 1000))}s`
    const id = toast(`Rewriting… ${formatElapsed()}`, {
      icon: <LoadingIcon />,
      duration: Infinity
    })
    const timer = window.setInterval(() => {
      toast(`Rewriting… ${formatElapsed()}`, {
        id,
        icon: <LoadingIcon />,
        duration: Infinity
      })
    }, 1000)
    try {
      await convertToMindMapAsync({
        boardId,
        answer: message,
        toolType: type,
        saveAsIs,
        useAnchors
      })
      window.clearInterval(timer)
      const finalElapsed = formatElapsed()
      toast.success(`Notes updated. (${finalElapsed})`, {
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
      window.clearInterval(timer)
      const finalElapsed = formatElapsed()
      toast.error(`Failed to rewrite. (${finalElapsed})`, {
        id,
        icon: <ErrorIcon />,
        duration: undefined
      })
    } finally {
      window.clearInterval(timer)
      setProcessing(false)
    }
  }

  // Create a new board, then generate — one toast sequence for the whole flow
  const createAndLaunch = async () => {
    if (!ensureMessage()) return
    if (processing) return

    setProcessing(true)
    const startedAt = Date.now()
    const formatElapsed = () => `${Math.max(0, Math.floor((Date.now() - startedAt) / 1000))}s`
    const id = toast(
      `Creating board and rewriting… ${formatElapsed()}`,
      {
        icon: <LoadingIcon />,
        duration: Infinity
      }
    )
    const timer = window.setInterval(() => {
      toast(`Creating board and rewriting… ${formatElapsed()}`, {
        id,
        icon: <LoadingIcon />,
        duration: Infinity
      })
    }, 1000)
    try {
      const boardId = await createBoardAsync()
      await convertToMindMapAsync({ boardId, answer: message, toolType: type, saveAsIs, useAnchors })
      window.clearInterval(timer)
      const finalElapsed = formatElapsed()
      toast.success(
        `Notes updated. (${finalElapsed})`,
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
      window.clearInterval(timer)
      const finalElapsed = formatElapsed()
      toast.error(
        `Could not create the board or rewrite. (${finalElapsed})`,
        {
          id,
          icon: <ErrorIcon />,
          duration: undefined
        })
    } finally {
      window.clearInterval(timer)
      setProcessing(false)
    }
  }

  const label = type === "notify" ? "Notify" : type === "mapify" ? "Mapify" : "Schemify"
  const icon = type === "notify" ? NotebookIcon : type === "mapify" ? GitForkIcon : ChartBubbleIcon

  const buttonClass = clsx(
    "relative transition-all text-xs text-secondary hover:bg-accent hover:shadow-xs font-medium flex flex-row items-center gap-2 p-1 rounded-md overflow-hidden",
    processing && "opacity-75 pointer-events-none"
  )

  const iconCpn = processing ?
    <LoadingIcon /> :
    <HugeiconsIcon icon={icon} className="size-4" strokeWidth={2} />

  return (
    <>
      {!boardId ? (
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
              onClick={() => launchGeneration(boardId)}
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
