import { BoardUrl } from "@/routes"
import { BoardView } from "../components/board-view"
import { useParams, useSearch } from "@tanstack/react-router"
import { useGraphStore } from "../store/graph-store"
import { useEffect } from "react"


// Board screen
export const BoardScreen = () => {
  const { id: boardId } = useParams({ from: BoardUrl }) as { id: string }
  const boardSearch = useSearch({
    from: BoardUrl,
    select: (s: { root_id?: string }) => ({ rootId: s.root_id }),
    shouldThrow: false,
  })
  const rootId = boardSearch?.rootId

  const setGraphScope = useGraphStore(state => state.setGraphScope)

  useEffect(() => {
    setGraphScope({ boardId, rootId })
  }, [boardId, rootId, setGraphScope])

  return (
    <>
      <BoardView />
    </>
  )
}
