import { ReactFlowProvider } from "@xyflow/react"
import GraphEditor from "./graph"
import { useGraphStore } from "../store/graph-store"
import { useEffect, useState } from "react"
import { ProgressBar } from "@/components/progress-bar"
import { useGetBoard } from "../api/get-board"


// This is the response focus component
export const GraphView = () => {
  const [loaded, setLoaded] = useState<boolean>(false)
  const { boardId } = useGraphStore()

  const { getBoardAsync } = useGetBoard()

  useEffect(() => {
    const fetchBoard = async () => {
      await getBoardAsync()
      setLoaded(true)

    }
    // update local store current board id with param from path
    if (!loaded) {
      fetchBoard()
    }
  }, [boardId, getBoardAsync, loaded])

  useEffect(() => {
    setLoaded(false)
  }, [boardId])

  return (
    <>
      <div
        className="absolute inset-0 h-full w-full overflow-hidden"
      >
        <ReactFlowProvider>
          <div className="relative h-full w-full bg-background">
            {
              !loaded ?
              <div className="absolute inset-0 bg-background flex items-center justify-center">
                <ProgressBar
                  message="Loading board"
                  viewMode="compact"
                />
              </div>
              :
              <GraphEditor />
            }
          </div>
        </ReactFlowProvider>
      </div>
    </>
  )
}