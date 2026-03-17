import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { ComputerTerminal01Icon, Loading02Icon, PlayIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useTheme } from "@/components/theme-provider"

import { executeCodeNote, type CodeExecutionResult } from "../../api/execute-code-note"
import { updateNote } from "../../api/update-note"
import { useGraphStore } from "../../store/graph-store"
import type { Note } from "../../types/note"
import { CodeArea } from "./code-area"
import {
  EMPTY_CODE_EXECUTION_RESULT,
  normalizeCode,
  ROSE_PINE_DARK,
  ROSE_PINE_LIGHT,
} from "./code-sandbox-utils"


type CodeSandboxDialogProps = {
  nodeId: string
}


/**
 * Full-screen style dialog for editing and running a Python code sandbox node.
 */
export const CodeSandboxDialog = memo(function CodeSandboxDialog({
  nodeId,
}: CodeSandboxDialogProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const palette = isDark ? ROSE_PINE_DARK : ROSE_PINE_LIGHT

  const note = useGraphStore((state) => state.nodesById.get(nodeId)?.data)
  const updateNodeByIdPersist = useGraphStore((state) => state.updateNodeByIdPersist)
  const closeNodeSurface = useGraphStore((state) => state.closeNodeSurface)

  const [codeDraft, setCodeDraft] = useState(note?.content?.markdown || "")
  const [isExecuting, setIsExecuting] = useState(false)
  const [result, setResult] = useState<CodeExecutionResult>(EMPTY_CODE_EXECUTION_RESULT)

  useEffect(() => {
    setCodeDraft(note?.content?.markdown || "")
  }, [note?.content?.markdown, nodeId])

  const saveDraft = useCallback((code: string) => {
    if (!note) return

    const normalizedCode = normalizeCode(code)
    updateNodeByIdPersist(note.id, (node) => ({
      ...node,
      data: {
        ...node.data,
        content: { markdown: normalizedCode },
        properties: {
          ...node.data.properties,
          programmingLanguage: { type: "text", text: "python" },
        },
      },
    }))
  }, [note, updateNodeByIdPersist])

  useEffect(() => {
    if (!note) return

    const timer = window.setTimeout(() => {
      saveDraft(codeDraft)
    }, 250)

    return () => window.clearTimeout(timer)
  }, [codeDraft, note, saveDraft])

  const handleOpenChange = useCallback((open: boolean) => {
    if (open) return
    saveDraft(codeDraft)
    closeNodeSurface()
  }, [closeNodeSurface, codeDraft, saveDraft])

  const handleExecute = useCallback(async () => {
    if (!note?.graphUid || isExecuting) return

    const normalizedCode = normalizeCode(codeDraft)
    if (normalizedCode !== codeDraft) {
      setCodeDraft(normalizedCode)
    }

    setIsExecuting(true)
    try {
      saveDraft(normalizedCode)

      await updateNote(note.graphUid, note.id, {
        content: { markdown: normalizedCode },
        properties: {
          programmingLanguage: { type: "text", text: "python" },
        } as Note["properties"],
      })

      const nextResult = await executeCodeNote(note.graphUid, note.id)
      setResult(nextResult)
    } catch (error) {
      setResult({
        status: "error",
        stdout: "",
        stderr: error instanceof Error ? error.message : "Execution failed.",
        durationMs: 0,
      })
    } finally {
      setIsExecuting(false)
    }
  }, [codeDraft, isExecuting, note, saveDraft])

  const lastRunLabel = useMemo(
    () => (result.durationMs > 0 ? `Last run • ${result.durationMs} ms` : "Last run"),
    [result.durationMs],
  )

  if (!note) return null

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden gap-0"
        showCloseButton={false}
        onPointerDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <DialogTitle className="sr-only">Python sandbox</DialogTitle>
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-border/70"
          style={{
            backgroundColor: palette.panel,
            color: palette.text,
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <HugeiconsIcon icon={ComputerTerminal01Icon} className="size-4 shrink-0" strokeWidth={2} />
            <span className="text-sm font-semibold">Python sandbox</span>
            <span className="text-xs font-medium" style={{ color: palette.muted }}>
              Python
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: palette.muted }}>
              Max runtime 60s
            </span>
            <Button type="button" size="sm" onClick={handleExecute} disabled={isExecuting} className="gap-2">
              {isExecuting ? (
                <HugeiconsIcon icon={Loading02Icon} className="size-4 shrink-0 animate-spin" strokeWidth={2} />
              ) : (
                <HugeiconsIcon icon={PlayIcon} className="size-4 shrink-0" strokeWidth={2} />
              )}
              {isExecuting ? "Running" : "Execute"}
            </Button>
          </div>
        </div>

        <div className="grid flex-1 min-h-0 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="min-h-0" style={{ backgroundColor: palette.bg }}>
            <CodeArea
              value={codeDraft}
              isDark={isDark}
              textColor={palette.text}
              onChange={setCodeDraft}
            />
          </div>

          <div className="grid min-h-0 grid-rows-[auto_1fr_1fr]" style={{ backgroundColor: palette.panel }}>
            <div className="px-4 py-3 text-xs font-medium" style={{ color: palette.muted }}>
              {lastRunLabel}
            </div>

            <div className="min-h-0 border-t border-border/70">
              <div className="px-4 py-2 text-xs font-semibold" style={{ color: palette.accent }}>
                stdout
              </div>
              <pre
                className="h-full overflow-auto overflow-x-auto scrollbar-thin px-4 pb-4 whitespace-pre-wrap break-all font-mono text-xs leading-5"
                style={{ color: palette.text }}
              >
                {result.stdout || "No stdout"}
              </pre>
            </div>

            <div className="min-h-0 border-t border-border/70">
              <div className="px-4 py-2 text-xs font-semibold" style={{ color: palette.danger }}>
                stderr
              </div>
              <pre
                className="h-full overflow-auto overflow-x-auto scrollbar-thin px-4 pb-4 whitespace-pre-wrap break-all font-mono text-xs leading-5"
                style={{ color: result.stderr ? palette.danger : palette.muted }}
              >
                {result.stderr || "No stderr"}
              </pre>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})
