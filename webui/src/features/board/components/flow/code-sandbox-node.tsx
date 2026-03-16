import { memo, useEffect, useMemo, useState } from "react"
import { ComputerTerminal01Icon, Loading02Icon, PlayIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import hljs from "highlight.js/lib/core"
import python from "highlight.js/lib/languages/python"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useTheme } from "@/components/theme-provider"

import { executeCodeNote, type CodeExecutionResult } from "../../api/execute-code-note"
import { updateNote } from "../../api/update-note"
import { useGraphStore } from "../../store/graph-store"
import type { Note } from "../../types/note"
import { CodeArea } from "./code-area"
import "./code-sandbox-node.css"


type CodeSandboxNodeProps = {
  note: Note
  selected: boolean
  dragging?: boolean
}


const ROSE_PINE_DARK = {
  bg: "#191724",
  panel: "#1f1d2e",
  text: "#e0def4",
  muted: "#908caa",
  accent: "#9ccfd8",
  danger: "#eb6f92",
}

const ROSE_PINE_LIGHT = {
  bg: "#faf4ed",
  panel: "#fffaf3",
  text: "#575279",
  muted: "#797593",
  accent: "#286983",
  danger: "#b4637a",
}

const EMPTY_RESULT: CodeExecutionResult = {
  status: "success",
  stdout: "",
  stderr: "",
  durationMs: 0,
}

hljs.registerLanguage("python", python)


const highlightPython = (code: string) => hljs.highlight(code || " ", { language: "python" }).value


const normalizeCode = (code: string) => code
  .split("\n")
  .map(line => line.replace(/[ \t]+$/g, ""))
  .join("\n")
  .replace(/\n+$/g, "")


/**
 * Read-only board preview plus dialog editor/executor for Python code sandbox notes.
 */
export const CodeSandboxNode = memo(function CodeSandboxNode({
  note,
  selected,
  dragging,
}: CodeSandboxNodeProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const palette = isDark ? ROSE_PINE_DARK : ROSE_PINE_LIGHT
  const updateNodeByIdPersist = useGraphStore(state => state.updateNodeByIdPersist)
  const isMoving = useGraphStore(state => state.isMoving)

  const [open, setOpen] = useState(false)
  const [codeDraft, setCodeDraft] = useState(note.content?.markdown || "")
  const [isExecuting, setIsExecuting] = useState(false)
  const [result, setResult] = useState<CodeExecutionResult>(EMPTY_RESULT)

  useEffect(() => {
    if (!open) {
      setCodeDraft(note.content?.markdown || "")
    }
  }, [note.content?.markdown, open])

  useEffect(() => {
    if (!selected) {
      setOpen(false)
    }
  }, [selected])

  useEffect(() => {
    if (!open) return

    const timer = window.setTimeout(() => {
      const normalizedCode = normalizeCode(codeDraft)
      updateNodeByIdPersist(note.id, node => ({
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
    }, 250)

    return () => window.clearTimeout(timer)
  }, [codeDraft, note.id, open, updateNodeByIdPersist])

  const codePreview = useMemo(
    () => codeDraft || note.content?.markdown || "# Write Python here",
    [codeDraft, note.content?.markdown],
  )
  const previewHtml = useMemo(() => highlightPython(codePreview), [codePreview])
  const suspendPreview = Boolean(isMoving || dragging)

  const handleExecute = async () => {
    if (!note.graphUid || isExecuting) return

    setIsExecuting(true)
    try {
      const normalizedCode = normalizeCode(codeDraft)
      if (normalizedCode !== codeDraft) {
        setCodeDraft(normalizedCode)
      }

      updateNodeByIdPersist(note.id, node => ({
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
  }

  return (
    <>
      <button
        type="button"
        className="w-full h-full text-left rounded-2xl overflow-hidden shadow-sm border border-border/50"
        onClick={() => setOpen(true)}
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
              className="hljs min-h-full whitespace-pre-wrap break-words text-[11px] leading-5 font-mono bg-transparent p-0"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          )}
          {suspendPreview && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ backgroundColor: isDark ? "rgba(31,29,46,0.62)" : "rgba(255,250,243,0.72)" }}
            >
              <div
                className="rounded-full px-3 py-1 text-[11px] font-medium"
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

      <Dialog open={open} onOpenChange={setOpen}>
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
              <span
                className="text-xs font-medium"
                style={{ color: palette.muted }}
              >
                Python
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: palette.muted }}>
                Max runtime 60s
              </span>
              <Button
                type="button"
                size="sm"
                onClick={handleExecute}
                disabled={isExecuting}
                className="gap-2"
              >
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
            <div
              className="min-h-0"
              style={{
                backgroundColor: palette.bg,
              }}
            >
              <CodeArea
                value={codeDraft}
                isDark={isDark}
                textColor={palette.text}
                onChange={setCodeDraft}
              />
            </div>

            <div
              className="grid min-h-0 grid-rows-[auto_1fr_1fr]"
              style={{ backgroundColor: palette.panel }}
            >
              <div
                className="px-4 py-3 text-xs font-medium"
                style={{
                  color: palette.muted,
                }}
              >
                Last run {result.durationMs > 0 ? `• ${result.durationMs} ms` : ""}
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
    </>
  )
})
