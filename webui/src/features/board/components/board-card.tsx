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
        transition-all
        rounded-xl
        text-card-foreground
        border border-transparent hover:border-border
        shadow-none hover:shadow-sm
        cursor-pointer
        w-60
        flex flex-col
        overflow-hidden
        gap-1
      `}
      onClick={handleClick}
    >
      {
        board.thumbnail ? (
          <div className='bg-card rounded-xl'>
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
            <div className='w-full text-xs text-muted-foreground mt-1'>
              <span>Last edited on </span>
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
        bg-card/75
        text-card-foreground
        border border-dashed border-border hover:border-border
        shadow-none hover:shadow-sm
        cursor-pointer
        w-60 h-40
        flex flex-col
        overflow-hidden
        gap-1
        flex items-center justify-center
      `}
      onClick={handleClick}
    >
      <HugeiconsIcon
        icon={PlusSignIcon}
        className='shrink-0 size-6 text-primary'
        strokeWidth={1.75}
      />
      <span className='font-medium text-sm text-primary'>New Board</span>
    </div>
  )
}
