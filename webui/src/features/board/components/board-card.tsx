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
        rounded-xl
        border border-border
        bg-card
        text-card-foreground
        p-4
        shadow-none hover:shadow-lg transition-shadow
        cursor-pointer
        w-60 h-40
      `}
      onClick={handleClick}
    >
      <h2 className='inline-block overflow-ellipsis font-medium'>{board.label || UNTITLED_LABEL}</h2>
    </div>
  )
}
