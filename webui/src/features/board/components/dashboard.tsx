import { useAppStore } from "@/store"
import { useListBoards } from "../api/list-boards"
import { BoardCard, NewBoardCard } from "./board-card"

/**
 * Dashboard component displaying user' boards
 */
export const Dashboard = () => {
  const userId = useAppStore((state) => state.userId)
  const { data: boards } = useListBoards({ userId })
  return (
    <div className='w-full h-full absolute inset-0'>
      <div className='w-full h-full overflow-x-hidden overflow-y-auto scrollbar-thin'>
        <div className='p-4 mt-4 gap-8 flex flex-row flex-wrap justify-start'>
          <h3 className='w-full text-xl text-secondary font-semibold text-center'>Your Boards</h3>
          <NewBoardCard />
          {boards?.map((board) => (
            <BoardCard key={board.uid} board={board} />
          ))}
        </div>
      </div>
    </div>
  )
}
