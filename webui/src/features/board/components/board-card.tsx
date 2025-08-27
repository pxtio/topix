import { useNavigate } from "@tanstack/react-router"
import { UNTITLED_LABEL } from "../const"


// Board card thumbnail component
export const BoardCard = ({
  board
}: {
  board: {
    id: string,
    label?: string
  }
}) => {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate({ to: '/boards/$id', params: { id: board.id } })
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
