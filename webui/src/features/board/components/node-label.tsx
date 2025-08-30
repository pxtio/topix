import { useReactFlow } from "@xyflow/react"
import type { Note } from "../types/note"
import TextareaAutosize from 'react-textarea-autosize'
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { NoteNode } from "../types/flow"
import { MdEditor } from "@/components/editor/milkdown"
import { MilkdownProvider } from "@milkdown/react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { fontFamilyToTwClass, fontSizeToTwClass, textStyleToTwClass } from "../types/style"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDiagonalIcon } from "@hugeicons/core-free-icons"
import { clsx } from "clsx"
import { Shape } from "./notes/shape"
import { StickyNote } from "./notes/sticky-note"

type NodeLabelProps = {
  note: Note
  selected: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * Renders the node's inline preview and the full editor dialog.
 * - StickyNote (type "sheet"): click preview to open dialog
 * - Shape (others): must click the floating "View Note" button to open dialog
 */
export const NodeLabel = ({ note, selected, open, onOpenChange }: NodeLabelProps) => {
  const isSheet = note.style.type === 'sheet'

  const [internalOpen, setInternalOpen] = useState(false)
  const dialogOpen = typeof open === 'boolean' ? open : internalOpen
  const setDialogOpen = useCallback((v: boolean) => {
    if (typeof open === 'boolean') onOpenChange?.(v)
    else setInternalOpen(v)
  }, [open, onOpenChange])

  const { setNodes } = useReactFlow()

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [labelEditing, setLabelEditing] = useState(false)

  // Reset edit + dialog when selection is lost
  useEffect(() => {
    if (!selected) {
      setLabelEditing(false)
      setDialogOpen(false)
    }
  }, [selected, setDialogOpen])

  const handleLabelChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newLabel = event.target.value
    setNodes(nds => nds.map(node => {
      if (node.id === note.id) {
        return {
          ...node,
          data: { ...node.data, label: { markdown: newLabel } }
        } as NoteNode
      }
      return node
    }))
  }, [note.id, setNodes])

  const handleNoteChange = useCallback((markdown: string) => {
    setNodes(nds => nds.map(node => {
      if (node.id === note.id) {
        return { ...node, data: { ...node.data, content: { markdown } } }
      }
      return node
    }))
  }, [note.id, setNodes])

  const stopDragging = useCallback((e: React.PointerEvent) => {
    if (labelEditing) e.stopPropagation()
  }, [labelEditing])

  const onDoubleClick = useCallback(() => {
    if (isSheet) return
    setLabelEditing(true)
    // focus end of textarea next tick
    setTimeout(() => {
      const textarea = textareaRef.current
      if (!textarea) return
      textarea.focus()
      const len = textarea.value.length
      textarea.setSelectionRange(len, len)
    }, 0)
  }, [isSheet])

  // Memo classnames derived from style
  const labelClass = useMemo(() => clsx(
    `relative bg-transparent overflow-visible w-[300px] min-h-[50px] flex items-center justify-center`,
    isSheet ? `h-[300px] ${fontFamilyToTwClass(note.style.fontFamily)} p-4` : `p-2`
  ), [isSheet, note.style.fontFamily])

  const titleEditorClass = `text-3xl focus:outline-none focus:ring-0 focus:border-none overflow-hidden whitespace-normal break-words resize-none w-full`

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <div
        className={labelClass}
        onDoubleClick={onDoubleClick}
        onPointerDown={stopDragging}
        style={{ color: note.style.textColor || 'inherit' }}
      >
        {selected && !isSheet && (
          <div className='absolute top-2 inset-x-0 -translate-y-[calc(100%+0.5rem)] text-xs font-sans flex items-center justify-center gap-2 z-40'>
            <DialogTrigger asChild>
              <button
                className='transition-colors px-2 py-1 text-foreground/50 hover:text-foreground flex items-center justify-center gap-2'
                aria-label='View note'
              >
                <HugeiconsIcon icon={ArrowDiagonalIcon} className='size-4 shrink-0' strokeWidth={1.75} />
                <span>View Note</span>
              </button>
            </DialogTrigger>
          </div>
        )}

        {isSheet ? (
          <StickyNote content={note.content?.markdown || ''} onOpen={() => setDialogOpen(true)} />
        ) : (
          <Shape
            value={note.label?.markdown || ''}
            labelEditing={labelEditing}
            onChange={handleLabelChange}
            textareaRef={textareaRef}
            textAlign={note.style.textAlign}
            styleHelpers={{
              text: textStyleToTwClass(note.style.textStyle),
              font: fontFamilyToTwClass(note.style.fontFamily),
              size: fontSizeToTwClass(note.style.fontSize)
            }}
          />
        )}
      </div>

      <DialogContent className='sm:max-w-4xl h-3/4 flex flex-col items-center text-left p-2'>
        {isSheet ? (
          <DialogHeader className='invisible'>
            <DialogTitle />
            <DialogDescription />
          </DialogHeader>
        ) : (
          <DialogHeader className='w-full'>
            <DialogTitle asChild>
              <div className='flex items-center gap-2 w-full pt-10 px-24'>
                <TextareaAutosize
                  className={titleEditorClass}
                  value={note.label?.markdown || ''}
                  onChange={handleLabelChange}
                  placeholder=''
                />
              </div>
            </DialogTitle>
            <DialogDescription className='invisible'>Note description</DialogDescription>
          </DialogHeader>
        )}

        <div className='min-h-0 flex-1 flex items-center w-full'>
          <ScrollArea className='h-full w-full'>
            <MilkdownProvider>
              <MdEditor markdown={note.content?.markdown || ''} onSave={handleNoteChange} />
            </MilkdownProvider>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}