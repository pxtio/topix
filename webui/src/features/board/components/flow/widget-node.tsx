import { memo } from "react"

import { Layout01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useTheme } from "@/components/theme-provider"

import { useGraphStore } from "../../store/graph-store"
import type { Note } from "../../types/note"
import { WidgetIframe } from "./widget-iframe"


type WidgetNodeProps = {
  note: Note
  dragging?: boolean
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
  const isMoving = useGraphStore((state) => state.isMoving)
  const openNodeSurface = useGraphStore((state) => state.openNodeSurface)
  const html = note.content?.markdown?.trim() || ""
  const suspendPreview = Boolean(isMoving || dragging)

  return (
    <button
      type="button"
      className="relative w-full h-full overflow-hidden rounded-2xl border border-border/60 bg-card text-left shadow-sm"
      onClick={() => openNodeSurface(note.id, "widget")}
      title="Open widget"
    >
      {html && !suspendPreview ? (
        <WidgetIframe
          html={html}
          title="Widget"
          className="pointer-events-none h-full w-full border-0 bg-white"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
          <HugeiconsIcon icon={Layout01Icon} className="size-5 shrink-0" strokeWidth={2} />
          <span>Widget HTML will render here</span>
        </div>
      )}
      {suspendPreview && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: isDark ? "rgba(31,29,46,0.62)" : "rgba(255,250,243,0.72)" }}
        >
          <div
            className="rounded-full px-3 py-1 text-base font-medium"
            style={{
              color: isDark ? "#908caa" : "#797593",
              backgroundColor: isDark ? "rgba(64,61,82,0.72)" : "rgba(223,218,217,0.8)",
            }}
          >
            Moving widget...
          </div>
        </div>
      )}
    </button>
  )
})
