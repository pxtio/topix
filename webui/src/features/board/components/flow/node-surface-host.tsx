import { memo, useEffect } from "react"

import { useGraphStore } from "../../store/graph-store"
import { CodeSandboxDialog } from "./code-sandbox-dialog"
import { SheetNodeDialog } from "./sheet-node-dialog"
import { WidgetDialog } from "./widget-dialog"


/**
 * Mounts the currently active rich node surface once at board level.
 */
export const NodeSurfaceHost = memo(function NodeSurfaceHost() {
  const activeNodeSurface = useGraphStore((state) => state.activeNodeSurface)
  const hasNode = useGraphStore((state) =>
    activeNodeSurface ? state.nodesById.has(activeNodeSurface.nodeId) : false,
  )
  const closeNodeSurface = useGraphStore((state) => state.closeNodeSurface)

  useEffect(() => {
    if (activeNodeSurface && !hasNode) {
      closeNodeSurface()
    }
  }, [activeNodeSurface, closeNodeSurface, hasNode])

  if (!activeNodeSurface || !hasNode) return null

  if (activeNodeSurface.kind === "sheet") {
    return <SheetNodeDialog nodeId={activeNodeSurface.nodeId} />
  }

  if (activeNodeSurface.kind === "widget") {
    return <WidgetDialog nodeId={activeNodeSurface.nodeId} />
  }

  return <CodeSandboxDialog nodeId={activeNodeSurface.nodeId} />
})
