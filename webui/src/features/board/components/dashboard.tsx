import { useAppStore } from "@/store"
import { useListBoards } from "../api/list-boards"
import { BoardCard } from "./board-card"
import { ScrollArea } from "@/components/ui/scroll-area"


/**
 * Dashboard component displaying user' boards
 */
export const Dashboard = () => {
  const userId = useAppStore((state) => state.userId)
  const { data: boards } = useListBoards({ userId })
  return (
    <div className='w-full h-full absolute inset-0'>
      <ScrollArea className='w-full h-full'>
        <div className='p-4 gap-4 flex flex-row flex-wrap'>
          {boards?.map((board) => (
            <BoardCard key={board.uid} board={board} />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
