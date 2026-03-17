import { memo, useCallback, useEffect, useRef, useState } from "react"
import { Cancel01Icon, LinkSquare02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { SheetUrl } from "@/routes"

import { useGraphStore } from "../../store/graph-store"
import { SheetEditor } from "../sheet/sheet-editor"


type SheetNodeDialogProps = {
  nodeId: string
}


/**
 * Rich sheet dialog rendered once at board level for the active sheet node.
 */
export const SheetNodeDialog = memo(function SheetNodeDialog({
  nodeId,
}: SheetNodeDialogProps) {
  const navigate = useNavigate()
  const note = useGraphStore((state) => state.nodesById.get(nodeId)?.data)
  const updateNodeByIdPersist = useGraphStore((state) => state.updateNodeByIdPersist)
  const closeNodeSurface = useGraphStore((state) => state.closeNodeSurface)

  const [titleEditing, setTitleEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState(note?.label?.markdown || "")
  const titleInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!titleEditing) {
      setTitleDraft(note?.label?.markdown || "")
    }
  }, [note?.label?.markdown, titleEditing])

  useEffect(() => {
    if (!titleEditing) return
    const frameId = requestAnimationFrame(() => {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    })
    return () => cancelAnimationFrame(frameId)
  }, [titleEditing])

  const persistTitle = useCallback((title: string) => {
    if (!note) return
    updateNodeByIdPersist(note.id, (node) => ({
      ...node,
      data: {
        ...node.data,
        label: { markdown: title },
      },
    }))
  }, [note, updateNodeByIdPersist])

  const stopTitleEdit = useCallback((save: boolean) => {
    if (!note) return
    if (save) {
      persistTitle(titleDraft)
    } else {
      setTitleDraft(note.label?.markdown || "")
    }
    setTitleEditing(false)
  }, [note, persistTitle, titleDraft])

  const handleOpenChange = useCallback((open: boolean) => {
    if (open) return
    if (titleEditing) {
      stopTitleEdit(true)
    }
    closeNodeSurface()
  }, [closeNodeSurface, stopTitleEdit, titleEditing])

  const handleNoteChange = useCallback((markdown: string) => {
    if (!note) return
    updateNodeByIdPersist(note.id, (node) => ({
      ...node,
      data: {
        ...node.data,
        content: { markdown },
      },
    }))
  }, [note, updateNodeByIdPersist])

  const handleOpenFullView = useCallback(() => {
    if (!note?.graphUid) return
    navigate({ to: SheetUrl, params: { id: note.graphUid, noteId: note.id } })
  }, [navigate, note?.graphUid, note?.id])

  if (!note) return null

  const displayTitle = note.label?.markdown?.trim() || "Untitled note"

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl h-3/4 flex flex-col items-center text-left p-2" showCloseButton={false}>
        <div className="w-full flex items-center justify-between gap-2 px-2 pt-1">
          <div className="min-w-0 flex-1 pr-2">
            {titleEditing ? (
              <input
                ref={titleInputRef}
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={() => stopTitleEdit(true)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    stopTitleEdit(true)
                  }
                  if (event.key === "Escape") {
                    event.preventDefault()
                    stopTitleEdit(false)
                  }
                }}
                className="w-full bg-transparent text-sm font-semibold text-foreground border-0 border-b border-foreground/30 focus:border-secondary focus:outline-none px-0 py-0.5"
                placeholder="Untitled note"
              />
            ) : (
              <button
                type="button"
                onClick={() => setTitleEditing(true)}
                className="block max-w-full truncate text-left text-sm font-semibold text-foreground hover:underline"
                title={displayTitle}
              >
                {displayTitle}
              </button>
            )}
            <DialogTitle className="sr-only">Sheet</DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm" onClick={handleOpenFullView} title="Open full view" aria-label="Open full view">
              <HugeiconsIcon icon={LinkSquare02Icon} className="size-4" strokeWidth={2} />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => handleOpenChange(false)} title="Close" aria-label="Close">
              <HugeiconsIcon icon={Cancel01Icon} className="size-4" strokeWidth={2} />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex items-center w-full h-full min-h-0 min-w-0">
          <div className="h-full w-full min-w-0 overflow-y-auto overflow-x-hidden scrollbar-thin">
            <SheetEditor value={note.content?.markdown || ""} onSave={handleNoteChange} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})
