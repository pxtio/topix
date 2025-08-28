import { Button } from "@/components/ui/button"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useListChats } from "@/features/agent/api/list-chats"
import { useChat } from "@/features/agent/hooks/chat-context"
import { useConvertToMindMap } from "@/features/board/api/convert-to-mindmap"
import { useCreateBoard } from "@/features/board/api/create-board"
import { useListBoards } from "@/features/board/api/list-boards"
import { UNTITLED_LABEL } from "@/features/board/const"
import { useAppStore } from "@/store"
import { MagicWand05Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"


/**
 * Generate a mind map from the selected message
 */
export const GenMindmapButton = ({ message }: { message: string }) => {
  const { chatId } = useChat()

  const { userId } = useAppStore()

  const { convertToMindMap } = useConvertToMindMap()
  const { data: boardList } = useListBoards({ userId })
  const { data: chatList } = useListChats({ userId })

  const { createBoardAsync } = useCreateBoard()

  const chat = chatList?.find(chat => chat.uid === chatId)

  const attachedBoardId = chat?.graphUid

  const launchGeneration = (boardId: string) => {
    convertToMindMap({
      boardId,
      answer: message
    })
  }

  const createAndLaunch = async () => {
    const boardId = await createBoardAsync({ userId })
    launchGeneration(boardId)
  }

  return (
    <>
      {
        !attachedBoardId ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={null}
                className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted flex flex-row items-center gap-2"
              >
                <HugeiconsIcon
                  icon={MagicWand05Icon}
                />
                <span>Mapify</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <DropdownMenuLabel>Boards</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='bg-accent/50'
                onClick={createAndLaunch}
              >
                <span>Create New Board</span>
              </DropdownMenuItem>
              {boardList?.map((board) => (
                <DropdownMenuItem
                  key={board.uid}
                  onClick={() => launchGeneration(board.uid)}
                >
                  {board.label || UNTITLED_LABEL}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
        :
        (
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <Button
                variant={null}
                className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted flex flex-row items-center gap-2"
                onClick={() => launchGeneration(attachedBoardId)}
              >
                <HugeiconsIcon
                  icon={MagicWand05Icon}
                  className='text-primary'
                />
                <span>Mapify</span>
              </Button>
            </ContextMenuTrigger>
            <ContextMenuContent className='w-48'>
              <ContextMenuLabel>Select a different board</ContextMenuLabel>
              <ContextMenuSeparator />
              <ContextMenuItem
                className='bg-accent/50'
                onClick={createAndLaunch}
              >
                <span>Create New Board</span>
              </ContextMenuItem>
              {boardList?.map((board) => (
                <ContextMenuItem
                  key={board.uid}
                  onClick={() => launchGeneration(board.uid)}
                >
                  {board.label || UNTITLED_LABEL}
                </ContextMenuItem>
              ))}
            </ContextMenuContent>
          </ContextMenu>
        )
      }
    </>
  )
}