import { ReactFlowProvider } from "@xyflow/react"
import GraphEditor from "./graph"


// This is the response focus component
export const GraphView = () => {
  return (
    <>
      <div
        className="absolute inset-0 h-full w-full overflow-hidden"
      >
        <div className='w-full h-full flex flex-col items-center justify-center'>
          <ReactFlowProvider>
            <div className="relative h-full w-full bg-background">
              <GraphEditor />
            </div>
          </ReactFlowProvider>
        </div>
      </div>
    </>
  )
}