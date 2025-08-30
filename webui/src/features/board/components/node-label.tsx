// components/flow/node-label.tsx
import { useReactFlow } from '@xyflow/react'
import type { Note } from '../types/note'
import TextareaAutosize from 'react-textarea-autosize'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { NoteNode } from '../types/flow'
import { MdEditor } from '@/components/editor/milkdown'
import { MilkdownProvider } from '@milkdown/react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { fontFamilyToTwClass, fontSizeToTwClass, textStyleToTwClass } from '../types/style'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDiagonalIcon, Delete02Icon, PinIcon, PinOffIcon } from '@hugeicons/core-free-icons'
import { clsx } from 'clsx'

// subcomponents
import { Shape } from './notes/shape'
import { StickyNote } from './notes/sticky-note'

type NoteWithPin = Note & { pinned?: boolean }

type NodeLabelProps = {
  note: NoteWithPin
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

  const { setNodes, setEdges } = useReactFlow()

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [labelEditing, setLabelEditing] = useState(false)

  // classNames derived from style
  const labelClass = useMemo(() => clsx(
    'relative bg-transparent overflow-visible w-[300px] min-h-[50px] flex items-center justify-center',
    isSheet ? `h-[300px] ${fontFamilyToTwClass(note.style.fontFamily)} p-4 pt-8` : 'p-2'
  ), [isSheet, note.style.fontFamily])

  const titleEditorClass = 'text-3xl focus:outline-none focus:ring-0 focus:border-none overflow-hidden whitespace-normal break-words resize-none w-full'

  const setDialogOpen = useCallback((v: boolean) => {
    if (typeof open === 'boolean') onOpenChange?.(v)
    else setInternalOpen(v)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!selected) {
      setLabelEditing(false)
      setDialogOpen(false)
    }
  }, [selected, setDialogOpen])

  // handlers
  const handleLabelChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newLabel = event.target.value
    setNodes(nds =>
      nds.map(node => {
        if (node.id === note.id) {
          return {
            ...node,
            data: { ...node.data, label: { markdown: newLabel } }
          } as NoteNode
        }
        return node
      })
    )
  }, [note.id, setNodes])

  const handleNoteChange = useCallback((markdown: string) => {
    setNodes(nds =>
      nds.map(node => {
        if (node.id === note.id) {
          return { ...node, data: { ...node.data, content: { markdown } } }
        }
        return node
      })
    )
  }, [note.id, setNodes])

  const stopDragging = useCallback((e: React.PointerEvent) => {
    if (labelEditing) e.stopPropagation()
  }, [labelEditing])

  const onDoubleClick = useCallback(() => {
    if (isSheet) return
    setLabelEditing(true)
    setTimeout(() => {
      const textarea = textareaRef.current
      if (!textarea) return
      textarea.focus()
      const len = textarea.value.length
      textarea.setSelectionRange(len, len)
    }, 0)
  }, [isSheet])

  const openDialogFromSticky = useCallback(() => {
    setDialogOpen(true)
  }, [setDialogOpen])

  const onTogglePin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const isPinned = note.pinned === true
    setNodes(nds =>
      nds.map(n =>
        n.id === note.id
          ? ({ ...n, data: { ...n.data, pinned: !isPinned } }) as NoteNode
          : n
      )
    )
  }, [note.id, note.pinned, setNodes])

  const onDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setNodes(nds => nds.filter(n => n.id !== note.id))
    setEdges?.(eds => eds.filter(edge => edge.source !== note.id && edge.target !== note.id))
  }, [note.id, setNodes, setEdges])

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <div
        className={labelClass}
        onDoubleClick={onDoubleClick}
        onPointerDown={stopDragging}
        style={{ color: note.style.textColor || 'inherit' }}
      >
        {isSheet && (
          <div className='absolute top-0 inset-x-0 py-1 px-2 flex flex-row items-center gap-1 z-40 border-b border-border justify-end bg-background/20'>
            <button
              className='p-1 text-foreground/60 hover:text-foreground transition-colors'
              onClick={onTogglePin}
              aria-label='Toggle pin'
              title='Pin/Unpin'
            >
              {note.pinned ? <HugeiconsIcon icon={PinIcon} className='w-4 h-4 text-primary' strokeWidth={1.75} /> : <HugeiconsIcon icon={PinOffIcon} className='w-4 h-4' strokeWidth={1.75} />}
            </button>
            <button
              className='p-1 text-foreground/60 hover:text-destructive transition-colors'
              onClick={onDelete}
              aria-label='Delete note'
              title='Delete'
            >
              <HugeiconsIcon icon={Delete02Icon} className='w-4 h-4' strokeWidth={1.75} />
            </button>
          </div>
        )}

        {/* SHAPE: top-center button to open dialog */}
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

        {/* PREVIEW AREA */}
        {isSheet ? (
          <StickyNote content={note.content?.markdown || ''} onOpen={openDialogFromSticky} />
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

      {/* DIALOG CONTENT (full editor) */}
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