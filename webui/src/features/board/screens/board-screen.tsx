import { BoardUrl } from "@/routes"
import { GraphView } from "../components/graph-view"
import { useParams } from "@tanstack/react-router"
import { useGraphStore } from "../store/graph-store"
import { useEffect } from "react"


// Board screen
export const BoardScreen = () => {
  const { id: boardId } = useParams({ from: BoardUrl }) as { id: string }

  const setBoardId = useGraphStore(state => state.setBoardId)

  useEffect(() => {
    setBoardId(boardId)
  }, [boardId, setBoardId])

  return (
    <>
      <GraphView />
    </>
  )
}