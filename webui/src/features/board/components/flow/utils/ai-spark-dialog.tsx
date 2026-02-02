import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { NoteNode } from "@/features/board/types/flow"
import { buildContextTextFromNodes } from "@/features/board/utils/context-text"
import { useAiSparkActions } from "@/features/board/hooks/use-ai-spark-actions"
import { Sparkles } from "lucide-react"

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
  const [selectedAction, setSelectedAction] = useState("summarize")
  const [contextText, setContextText] = useState("")
  const [useSelection, setUseSelection] = useState(false)
  const [processing, setProcessing] = useState(false)
  const { actions, runAction } = useAiSparkActions()

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

  useEffect(() => {
    const action = actions.find((item) => item.key === selectedAction)
    if (action && selectedAction !== "custom") {
      setRequestText(action.request)
    }
  }, [actions, selectedAction])

  const handleSubmit = async () => {
    const trimmedContext = contextText.trim()
    if (processing) return

    setProcessing(true)
    onOpenChange(false)
    const customRequest = selectedAction === "custom" ? requestText.trim() : undefined
    const actionKey = selectedAction === "custom" ? undefined : selectedAction
    await runAction({ boardId, contextText: trimmedContext, actionKey, customRequest })
    setProcessing(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-secondary" />
            <span>AI Spark</span>
          </DialogTitle>
          <DialogDescription>
            Run an AI action on selected nodes or custom context.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <label className="text-xs font-medium text-muted-foreground">Action</label>
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an action" />
              </SelectTrigger>
              <SelectContent>
                {actions.map((action) => (
                  <SelectItem key={action.key} value={action.key}>
                    {action.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom action</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-medium text-muted-foreground">Request</label>
            <Input
              value={requestText}
              onChange={(event) => setRequestText(event.target.value)}
              placeholder="What should the AI do?"
              disabled={selectedAction !== "custom"}
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
              rows={24}
              disabled={useSelection && selectionContext.length > 0}
              className='resize-none min-h-[320px]'
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
