import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import type { NoteNode } from "@/features/board/types/flow"
import { buildContextTextFromNodes } from "@/features/board/utils/context-text"
import { useConvertToMindMap } from "@/features/board/api/convert-to-mindmap"

export interface AiSparkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  boardId?: string
  selectedNodes?: NoteNode[]
}

export const AiSparkDialog = ({
  open,
  onOpenChange,
  boardId,
  selectedNodes = [],
}: AiSparkDialogProps) => {
  const [requestText, setRequestText] = useState("")
  const [contextText, setContextText] = useState("")
  const [useSelection, setUseSelection] = useState(false)
  const [processing, setProcessing] = useState(false)
  const { convertToMindMapAsync } = useConvertToMindMap()

  const selectionContext = useMemo(
    () => buildContextTextFromNodes(selectedNodes),
    [selectedNodes]
  )

  useEffect(() => {
    if (!open) return
    const hasSelection = selectionContext.length > 0
    setUseSelection(hasSelection)
    if (hasSelection) {
      setContextText(selectionContext)
    }
  }, [open, selectionContext])

  useEffect(() => {
    if (!useSelection) return
    setContextText(selectionContext)
  }, [useSelection, selectionContext])

  const handleSubmit = async () => {
    if (!boardId) {
      toast.error("Select a board first.")
      return
    }
    const trimmedContext = contextText.trim()
    const trimmedRequest = requestText.trim()
    if (!trimmedContext) {
      toast.error("Add some context text first.")
      return
    }
    if (processing) return

    const answer = `Request: ${trimmedRequest || "Summarize"}\n---\nInput Text:\n${trimmedContext}`

    setProcessing(true)
    const toastId = toast("Working on it…", { duration: Infinity })
    try {
      await convertToMindMapAsync({
        boardId,
        answer,
        toolType: "summify",
      })
      toast.success("Added to board.", { id: toastId })
      onOpenChange(false)
    } catch (error) {
      console.error("AI action failed:", error)
      toast.error("Could not complete the action.", { id: toastId })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>AI Spark</DialogTitle>
          <DialogDescription>
            Run an AI action on selected nodes or custom context.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <label className="text-xs font-medium text-muted-foreground">Request</label>
            <Input
              value={requestText}
              onChange={(event) => setRequestText(event.target.value)}
              placeholder="What should the AI do?"
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-muted-foreground">Context</label>
              <button
                type="button"
                className="text-xs text-secondary underline-offset-2 hover:underline disabled:opacity-50"
                onClick={() => setUseSelection(!useSelection)}
                disabled={selectionContext.length === 0}
              >
                {useSelection ? "Use custom text" : "Use selection"}
              </button>
            </div>
            <Textarea
              value={contextText}
              onChange={(event) => setContextText(event.target.value)}
              placeholder="Paste or describe the context..."
              rows={6}
              disabled={useSelection && selectionContext.length > 0}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={processing}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={processing}>
            Run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
