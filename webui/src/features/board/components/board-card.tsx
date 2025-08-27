import { useNavigate } from "@tanstack/react-router"
import { UNTITLED_LABEL } from "../const"
import type { Graph } from "../types/board"


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
        <span className='inline-block font-medium text-xs'>{board.label || UNTITLED_LABEL}</span>
      </div>
    </div>
  )
}
