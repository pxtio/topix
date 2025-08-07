import { ReactFlowProvider } from "@xyflow/react"
import GraphEditor from "./graph"
import { useGraphStore } from "../store/graph-store"
import { useMindMapStore } from "@/features/agent/store/mindmap-store"
import { useEffect, useState } from "react"
import { ProgressBar } from "@/components/progress-bar"


// This is the response focus component
export const GraphView = () => {
  const [loading, setLoading] = useState(true)
  const { boardId, isLoading } = useGraphStore()
  const { isProcessing, inProcessingBoardId } = useMindMapStore()

  useEffect(() => {
    if (isLoading || (isProcessing && inProcessingBoardId === boardId)) {
      setLoading(true)
    } else {
      setLoading(false)
    }
  }, [isLoading, isProcessing, inProcessingBoardId, boardId])

  return (
    <>
      <div
        className="absolute inset-0 h-full w-full overflow-hidden"
      >
        <div className='w-full h-full flex flex-col items-center justify-center'>
          <ReactFlowProvider>
            <div className="relative h-full w-full bg-background">
              <GraphEditor />
              {
                loading &&
                <div className="absolute inset-0 bg-background flex items-center justify-center">
                  <ProgressBar
                    message="Loading board"
                    viewMode="compact"
                  />
                </div>
              }
            </div>
          </ReactFlowProvider>
        </div>
      </div>
    </>
  )
}