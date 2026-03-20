import { memo, useEffect, useMemo, useState } from "react"
import type { Viewport } from "@xyflow/react"

import { DragDropIcon, Layout01Icon, Maximize01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useTheme } from "@/components/theme-provider"
import { useShallow } from "zustand/react/shallow"

import { useGraphStore } from "../../store/graph-store"
import type { Note } from "../../types/note"
import { WidgetIframe } from "./widget-iframe"


type WidgetNodeProps = {
  note: Note
  dragging?: boolean
}


/**
 * Convert the current viewport transform into graph-space bounds.
 */
const getViewportBounds = (viewport: Viewport, width: number, height: number) => {
  const left = -viewport.x / viewport.zoom
  const top = -viewport.y / viewport.zoom
  const right = (width - viewport.x) / viewport.zoom
  const bottom = (height - viewport.y) / viewport.zoom
  return { left, top, right, bottom }
}


/**
 * Check whether a note rect is fully contained in the current graph viewport.
 */
const isNoteInViewport = (
  note: Note,
  viewport: Viewport | undefined,
  rendererSize: { width: number; height: number } | null,
) => {
  if (!viewport || !rendererSize) return true

  const x = note.properties.nodePosition?.position?.x ?? 0
  const y = note.properties.nodePosition?.position?.y ?? 0
  const width = note.properties.nodeSize?.size?.width ?? 0
  const height = note.properties.nodeSize?.size?.height ?? 0
  const bounds = getViewportBounds(viewport, rendererSize.width, rendererSize.height)

  return x >= bounds.left &&
    y >= bounds.top &&
    x + width <= bounds.right &&
    y + height <= bounds.bottom
}


/**
 * Read-only board preview for widget notes rendered from HTML content.
 */
export const WidgetNode = memo(function WidgetNode({
  note,
  dragging,
}: WidgetNodeProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const [rendererSize, setRendererSize] = useState<{ width: number; height: number } | null>(null)
  const { boardId, rootId, graphViewports, isMoving, boardCanEdit } = useGraphStore(useShallow((state) => ({
    boardId: state.boardId,
    rootId: state.rootId,
    graphViewports: state.graphViewports,
    isMoving: state.isMoving,
    boardCanEdit: state.boardCanEdit,
  })))
  const openNodeSurface = useGraphStore((state) => state.openNodeSurface)
  const html = note.content?.markdown?.trim() || ""
  const scopeViewportKey = boardId ? `${boardId}:${rootId ?? "root"}` : undefined
  const viewport = scopeViewportKey ? graphViewports[scopeViewportKey] : undefined

  useEffect(() => {
    const renderer = document.querySelector(".react-flow__renderer") as HTMLElement | null
    if (!renderer) return

    const updateSize = () => {
      const rect = renderer.getBoundingClientRect()
      setRendererSize({ width: rect.width, height: rect.height })
    }

    updateSize()
    const observer = new ResizeObserver(() => updateSize())
    observer.observe(renderer)

    return () => observer.disconnect()
  }, [])

  const isVisibleInViewport = useMemo(
    () => isNoteInViewport(note, viewport, rendererSize),
    [note, rendererSize, viewport],
  )
  const suspendPreview = Boolean(isMoving || dragging || !isVisibleInViewport)

  return (
    <div
      className="relative w-full h-full overflow-hidden rounded-3xl border border-border/60 bg-card p-2 text-left shadow-sm"
    >
      <div className="absolute right-2 top-2 z-20 flex items-center gap-1">
        <div
          className="drag-handle flex size-8 cursor-grab items-center justify-center rounded-full border border-border/70 bg-background/90 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-accent hover:text-foreground active:cursor-grabbing"
          title="Drag widget"
          aria-label="Drag widget"
        >
          <HugeiconsIcon icon={DragDropIcon} className="size-4 shrink-0" strokeWidth={2} />
        </div>

        {boardCanEdit && (
          <button
            type="button"
            className="nodrag flex size-8 items-center justify-center rounded-full border border-border/70 bg-background/90 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-accent hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation()
              openNodeSurface(note.id, "widget")
            }}
            title="Open widget"
            aria-label="Open widget"
          >
            <HugeiconsIcon icon={Maximize01Icon} className="size-4 shrink-0" strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="nodrag h-full w-full overflow-hidden rounded-xl border border-border/50 bg-background">
        {html && !suspendPreview ? (
          <WidgetIframe
            html={html}
            title="Widget"
            className="h-full w-full border-0 bg-white"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
            <HugeiconsIcon icon={Layout01Icon} className="size-5 shrink-0" strokeWidth={2} />
            <span>Widget HTML will render here</span>
          </div>
        )}
      </div>
      {suspendPreview && (
        <div
          className="nodrag absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: isDark ? "rgba(31,29,46,0.62)" : "rgba(255,250,243,0.72)" }}
        >
          <div
            className="rounded-full px-3 py-1 text-base font-medium"
            style={{
              color: isDark ? "#908caa" : "#797593",
              backgroundColor: isDark ? "rgba(64,61,82,0.72)" : "rgba(223,218,217,0.8)",
            }}
          >
            {isMoving || dragging ? "Moving widget..." : "Widget preview paused"}
          </div>
        </div>
      )}
    </div>
  )
})
