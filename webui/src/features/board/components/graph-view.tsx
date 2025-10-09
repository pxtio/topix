import { ReactFlowProvider } from "@xyflow/react"
import { useEffect, useMemo } from "react"
import GraphEditor from "./flow/graph-editor"
import { useGraphStore } from "../store/graph-store"
import { LoadingWindow } from "@/components/loading-view"
import { useGetBoard } from "../api/get-board"

/**
 * GraphView
 *
 * Board-aware shell for the graph editor that triggers a fetch on board changes
 * and renders purely from derived loading state. It resets the mutation state
 * when the boardId changes, fires a single fetch, and relies on React Query's
 * status combined with the graph store's isLoading to avoid local race conditions.
 */
export const GraphView: React.FC = () => {
  const { boardId, isLoading: storeLoading } = useGraphStore()
  const { getBoardAsync, isPending, isSuccess, reset } = useGetBoard()

  useEffect(() => {
    if (!boardId) return
    reset()
    void getBoardAsync()
  }, [boardId, getBoardAsync, reset])

  const loading = useMemo(
    () => !isSuccess || isPending || storeLoading,
    [isSuccess, isPending, storeLoading]
  )

  return (
    <div className="absolute inset-0 h-full w-full overflow-hidden">
      <ReactFlowProvider>
        <div className="relative h-full w-full bg-background">
          {loading ? (
            <div className="absolute inset-0 bg-background flex items-center justify-center">
              <LoadingWindow message="Loading board" viewMode="compact" />
            </div>
          ) : (
            <GraphEditor />
          )}
        </div>
      </ReactFlowProvider>
    </div>
  )
}