// components/flow/node-label.tsx
import { useReactFlow } from '@xyflow/react'
import type { Note } from '../../types/note'
import TextareaAutosize from 'react-textarea-autosize'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { NoteNode } from '../../types/flow'
import { MdEditor } from '@/components/editor/milkdown'
import { MilkdownProvider } from '@milkdown/react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { fontFamilyToTwClass, fontSizeToTwClass, textStyleToTwClass } from '../../types/style'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDiagonalIcon, Delete02Icon, PaintBoardIcon, PinIcon, PinOffIcon } from '@hugeicons/core-free-icons'
import { clsx } from 'clsx'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// subcomponents
import { Shape } from '../notes/shape'
import { StickyNote } from '../notes/sticky-note'
import { TAILWIND_200 } from '../../lib/colors/tailwind'
import { darkModeDisplayHex } from '../../lib/colors/dark-variants'

type NoteWithPin = Note & { pinned?: boolean }

type NodeCardProps = {
  note: NoteWithPin
  selected: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  isDark: boolean
}

/**
 * Renders the node's inline preview and the full editor dialog.
 * - StickyNote (type "sheet"): click preview to open dialog
 * - Shape (others): must click the floating "View Note" button to open dialog
 * - Sheet-only toolbar: palette (bg color), pin, delete
 */
export const NodeCard = ({ note, selected, open, onOpenChange, isDark }: NodeCardProps) => {
  const isSheet = note.style.type === 'sheet'

  const [internalOpen, setInternalOpen] = useState(false)
  const dialogOpen = typeof open === 'boolean' ? open : internalOpen

  const { setNodes, setEdges } = useReactFlow()

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [labelEditing, setLabelEditing] = useState(false)

  const textColor = isDark ? darkModeDisplayHex(note.style.textColor) || undefined : note.style.textColor

  // classNames derived from style
  const labelClass = useMemo(() => clsx(
    'relative bg-transparent overflow-visible flex items-center justify-center',
    isSheet ?
    `w-[300px] h-[300px] ${fontFamilyToTwClass(note.style.fontFamily)} p-4 pt-8`
    :
    'w-full h-full p-2'
  ), [isSheet, note.style.fontFamily])

  const titleEditorClass = 'text-3xl focus:outline-none focus:ring-0 focus:border-none overflow-visible whitespace-normal break-words resize-none w-full'

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

  const updateStyle = useCallback((next: Partial<Note['style']>) => {
    setNodes(nds =>
      nds.map(n => {
        if (n.id !== note.id) return n
        const prevStyle = n.data.style as Note['style']
        return { ...n, data: { ...n.data, style: { ...prevStyle, ...next } } }
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

  const onPickPalette = useCallback((hex: string) => {
    updateStyle({ backgroundColor: hex })
  }, [updateStyle])

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <div
        className={labelClass}
        onDoubleClick={onDoubleClick}
        onPointerDown={stopDragging}
        style={{ color: textColor || 'inherit' }}
      >
        {isSheet && (
          <div className='absolute top-0 inset-x-0 py-1 px-2 flex flex-row items-center gap-1 z-40 shadow-xs justify-end bg-background/20'>
            {/* Palette popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className='p-1 text-foreground/60 hover:text-foreground transition-colors'
                  onClick={e => e.stopPropagation()}
                  aria-label='Background color'
                  title='Background color'
                >
                  <HugeiconsIcon icon={PaintBoardIcon} className='size-4 shrink-0' strokeWidth={1.75} />
                </button>
              </PopoverTrigger>
              <PopoverContent align='end' className='w-auto p-2'>
                <div className='grid grid-cols-6 gap-2'>
                  {TAILWIND_200.map(c => (
                    <button
                      key={c.name}
                      className='h-6 w-6 rounded-full border border-border hover:brightness-95'
                      style={{ backgroundColor: c.hex }}
                      title={`${c.name}-100`}
                      aria-label={`${c.name}-100`}
                      onClick={() => onPickPalette(c.hex)}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <button
              className='p-1 text-foreground/60 hover:text-foreground transition-colors'
              onClick={onTogglePin}
              aria-label='Toggle pin'
              title='Pin/Unpin'
            >
              {note.pinned
                ? <HugeiconsIcon icon={PinIcon} className='w-4 h-4 text-primary' strokeWidth={1.75} />
                : <HugeiconsIcon icon={PinOffIcon} className='w-4 h-4' strokeWidth={1.75} />
              }
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
          <DialogHeader className='hidden'>
            <DialogTitle />
            <DialogDescription />
          </DialogHeader>
        ) : (
          <DialogHeader className='w-full'>
            <DialogTitle asChild>
              <div className='flex items-center gap-2 w-full pt-10 px-20'>
                <TextareaAutosize
                  className={titleEditorClass}
                  value={note.label?.markdown || ''}
                  onChange={handleLabelChange}
                  placeholder=''
                />
              </div>
            </DialogTitle>
            <DialogDescription className='hidden'>Note description</DialogDescription>
          </DialogHeader>
        )}

        <div className='flex-1 flex items-center w-full h-full min-h-0 min-w-0'>
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
