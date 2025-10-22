import { useNavigate } from "@tanstack/react-router"
import { UNTITLED_LABEL } from "../const"
import type { Graph } from "../types/board"
import { useCreateBoard } from "../api/create-board"
import { useAppStore } from "@/store"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignIcon } from "@hugeicons/core-free-icons"
import { formatDateForUI } from "../utils/datetime"


// Board card thumbnail component
export const BoardCard = ({
  board
}: {
  board: Graph
}) => {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate({ to: '/boards/$id', params: { id: board.uid } })
  }

  const date = board.updatedAt || board.createdAt || null
  const dateString = date ? formatDateForUI(date) : null

  return (
    <div
      className={`
        bg-accent hover:bg-muted
        transition-all
        rounded-xl
        text-card-foreground
        border border-transparent hover:border-secondary
        hover:ring-2 hover:ring-secondary/50
        shadow-md hover:shadow-lg
        cursor-pointer
        w-60 h-60
        flex flex-col justify-between
        overflow-hidden
        gap-1
        p-1
      `}
      onClick={handleClick}
    >
      {
        board.thumbnail ? (
          <div className='bg-transparent rounded-xl'>
            <img
              src={board.thumbnail}
              alt={board.label || UNTITLED_LABEL}
              className='w-full h-40 object-cover rounded-md'
            />
          </div>
        ) : (
          <div className='w-full h-40 bg-card rounded-md' />
        )
      }
      <div className='p-2 w-full overflow-ellipsis'>
        <h4 className='inline-block font-medium text-sm'>{board.label || UNTITLED_LABEL}</h4>
        {
          dateString && (
            <div className='w-full text-xs text-muted-foreground font-mono mt-1'>
              <span className='ml-auto'>{dateString}</span>
            </div>
          )
        }
      </div>
    </div>
  )
}


// New board card component
export const NewBoardCard = () => {
  const { userId } = useAppStore()
  const { createBoardAsync } = useCreateBoard()
  const navigate = useNavigate()

  const handleClick = async () => {
    const newId = await createBoardAsync({ userId })
    // Go to /boards/:id (no page refresh)
    navigate({ to: '/boards/$id', params: { id: newId } })
  }

  return (
    <div
      className={`
        transition-all
        rounded-xl
        bg-transparent hover:bg-accent
        hover:ring-2 hover:ring-secondary/10
        text-card-foreground
        border-2 border-border hover:border-secondary border-dashed
        shadow-none hover:shadow-sm
        cursor-pointer
        w-60 h-60
        flex flex-col
        overflow-hidden
        gap-1
        flex items-center justify-center
        p-1
      `}
      onClick={handleClick}
    >
      <HugeiconsIcon
        icon={PlusSignIcon}
        className='shrink-0 size-6 text-secondary'
        strokeWidth={2}
      />
      <span className='font-medium text-sm text-secondary'>New Board</span>
    </div>
  )
}
