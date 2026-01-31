import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useParseDocument } from "@/features/board/api/parse-document"
import { useGraphStore } from "@/features/board/store/graph-store"
import { HugeiconsIcon } from "@hugeicons/react"
import { CancelIcon, CheckmarkCircle03Icon, ReloadIcon } from "@hugeicons/core-free-icons"

export interface DocumentUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const LoadingIcon = () => (
  <HugeiconsIcon
    icon={ReloadIcon}
    className="size-4 animate-spin [animation-duration:750ms]"
    strokeWidth={2}
  />
)

const SuccessIcon = () => (
  <HugeiconsIcon
    icon={CheckmarkCircle03Icon}
    className="text-foreground size-4"
    strokeWidth={2}
  />
)

const ErrorIcon = () => (
  <HugeiconsIcon
    icon={CancelIcon}
    className="text-destructive size-4"
    strokeWidth={2}
  />
)

/**
 * Dialog for uploading a document and triggering parsing.
 */
export const DocumentUploadDialog = ({
  open,
  onOpenChange,
}: DocumentUploadDialogProps) => {
  const boardId = useGraphStore(state => state.boardId)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { parseDocumentAsync } = useParseDocument()

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!file || !boardId || submitting) return

    setSubmitting(true)
    const id = toast("Parsing & Analyzing document…", { icon: <LoadingIcon />, duration: Infinity })
    onOpenChange(false)
    try {
      await parseDocumentAsync({ boardId, file })
      toast.dismiss(id)
      toast.success("Document parsed.", { icon: <SuccessIcon />, duration: 3000 })
      setFile(null)
    } catch (err) {
      console.error("Failed to parse document:", err)
      toast.dismiss(id)
      toast.error("Failed to parse document.", { icon: <ErrorIcon />, duration: 4000 })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload a document</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Input
              type="file"
              accept="application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">PDF files only.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!file || !boardId || submitting}>
              {submitting ? "Parsing…" : "Upload & Parse"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
