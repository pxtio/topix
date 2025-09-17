import { useAppStore } from "@/store"
import { useListBoards } from "../api/list-boards"
import { BoardCard, NewBoardCard } from "./board-card"
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
        <div className='p-4 mt-4 gap-8 flex flex-row flex-wrap justify-start'>
          <h3 className='w-full text-lg text-secondary font-semibold text-center'>Your Boards</h3>
          <NewBoardCard />
          {boards?.map((board) => (
            <BoardCard key={board.uid} board={board} />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
