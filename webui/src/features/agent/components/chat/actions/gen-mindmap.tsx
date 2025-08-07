import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useConvertToMindMap } from "@/features/board/api/convert-to-mindmap"
import { useListBoards } from "@/features/board/api/list-boards"
import { useAppStore } from "@/store"
import { WandSparkles } from "lucide-react"

export const GenMindmapButton = ({ message }: { message: string }) => {
  const { userId } = useAppStore()
  const { convertToMindMap } = useConvertToMindMap()
  const { data: boardList } = useListBoards({ userId })

  const launchGeneration = (boardId: string) => {
    convertToMindMap({
      boardId,
      answer: message
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={null}
          className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted flex flex-row items-center gap-2"
        >
          <WandSparkles className="size-4 shrink-0 text-primary" strokeWidth={1.75} />
          <span>Mapify</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        <DropdownMenuLabel>Boards</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {boardList?.map((board) => (
          <DropdownMenuItem
            key={board.id}
            onClick={() => launchGeneration(board.id)}
          >
            {board.label || "Untitled Board"}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}