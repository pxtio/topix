import { memo, useMemo } from "react"

import { useTheme } from "@/components/theme-provider"

import { useGraphStore } from "../../store/graph-store"
import type { Note } from "../../types/note"
import {
  highlightPython,
  ROSE_PINE_DARK,
  ROSE_PINE_LIGHT,
} from "./code-sandbox-utils"
import "./code-sandbox-node.css"


type CodeSandboxNodeProps = {
  note: Note
  dragging?: boolean
}


/**
 * Read-only board preview for Python sandbox notes.
 */
export const CodeSandboxNode = memo(function CodeSandboxNode({
  note,
  dragging,
}: CodeSandboxNodeProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const palette = isDark ? ROSE_PINE_DARK : ROSE_PINE_LIGHT
  const isMoving = useGraphStore((state) => state.isMoving)
  const openNodeSurface = useGraphStore((state) => state.openNodeSurface)

  const codePreview = note.content?.markdown || "# Write Python here"
  const previewHtml = useMemo(() => highlightPython(codePreview), [codePreview])
  const suspendPreview = Boolean(isMoving || dragging)

  return (
    <button
      type="button"
      className="w-full h-full text-left rounded-2xl overflow-hidden shadow-sm"
      onClick={() => openNodeSurface(note.id, "code-sandbox")}
      title="Open Python sandbox"
    >
      <div
        className={`code-sandbox-theme relative w-full h-full overflow-auto scrollbar-thin p-3 ${isDark ? "code-sandbox-theme-dark" : "code-sandbox-theme-light"}`}
        style={{
          backgroundColor: palette.bg,
          color: palette.text,
        }}
      >
        {!suspendPreview && (
          <pre
            className="hljs min-h-full whitespace-pre-wrap break-words text-base leading-5 font-mono bg-transparent p-0"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        )}
        {suspendPreview && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: isDark ? "rgba(31,29,46,0.62)" : "rgba(255,250,243,0.72)" }}
          >
            <div
              className="rounded-full px-3 py-1 text-base font-medium"
              style={{
                color: palette.muted,
                backgroundColor: isDark ? "rgba(64,61,82,0.72)" : "rgba(223,218,217,0.8)",
              }}
            >
              Moving sandbox...
            </div>
          </div>
        )}
      </div>
    </button>
  )
})
