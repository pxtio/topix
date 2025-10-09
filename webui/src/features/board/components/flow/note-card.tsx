// components/flow/node-label.tsx
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import type { Note, NoteProperties } from '../../types/note'
import type { NoteNode } from '../../types/flow'
import { MilkdownProvider } from '@milkdown/react'
import { MdEditor } from '@/components/editor/milkdown'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon, PaintBoardIcon, PinIcon, PinOffIcon } from '@hugeicons/core-free-icons'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { clsx } from 'clsx'

import { Shape } from '../notes/shape'
import { StickyNote } from '../notes/sticky-note'
import { TAILWIND_200 } from '../../lib/colors/tailwind'
import { darkModeDisplayHex } from '../../lib/colors/dark-variants'
import { fontFamilyToTwClass, fontSizeToTwClass, textStyleToTwClass } from '../../types/style'

type NoteWithPin = Note & { pinned?: boolean }

type NodeCardProps = {
  note: NoteWithPin
  selected: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  isDark: boolean
  contentRef: React.RefObject<HTMLDivElement | null>
}

export const NodeCard = ({
  note,
  selected,
  open,
  onOpenChange,
  isDark,
  contentRef
}: NodeCardProps) => {
  const isSheet = note.style.type === 'sheet'

  const [internalOpen, setInternalOpen] = useState(false)
  const dialogOpen = typeof open === 'boolean' ? open : internalOpen

  const { setNodes, setEdges } = useReactFlow()

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [labelEditing, setLabelEditing] = useState(false)

  // local draft that controls the textarea while editing
  const [labelDraft, setLabelDraft] = useState<string>(note.label?.markdown || '')

  // selection cache for resilient caret restore if remounts happen
  const selRef = useRef<{ start: number; end: number } | null>(null)

  const textColor = isDark ? darkModeDisplayHex(note.style.textColor) || undefined : note.style.textColor

  const isPinned = note.properties.pinned.boolean === true

  const fontFamily = note.style.type === 'sheet' ? 'sans-serif' : note.style.fontFamily

  const labelClass = useMemo(
    () =>
      clsx(
        'relative bg-transparent overflow-visible flex items-center justify-center',
        isSheet
          ? `w-[400px] h-[400px] ${fontFamilyToTwClass(fontFamily)} p-2 pt-8`
          : 'w-full h-full p-2'
      ),
    [isSheet, fontFamily]
  )

  const titleEditorClass =
    'text-3xl focus:outline-none focus:ring-0 focus:border-none overflow-visible whitespace-normal break-words resize-none w-full'

  const setDialogOpen = useCallback(
    (v: boolean) => {
      if (typeof open === 'boolean') onOpenChange?.(v)
      else setInternalOpen(v)
    },
    [open, onOpenChange]
  )

  // keep draft in sync when not editing or when external value changes
  useEffect(() => {
    if (!labelEditing) setLabelDraft(note.label?.markdown || '')
  }, [labelEditing, note.label?.markdown])

  // leave editing state if deselected or dialog is closed by selection change
  useEffect(() => {
    if (!selected) {
      setLabelEditing(false)
      setDialogOpen(false)
    }
  }, [selected, setDialogOpen])

  // focus and put caret at end when entering edit mode
  useEffect(() => {
    if (!labelEditing) return
    const el = textareaRef.current
    if (!el) return
    el.focus()
    const len = el.value.length
    try {
      el.setSelectionRange(len, len)
    } catch {
      console.warn('Failed to set selection range')
    }
  }, [labelEditing])

  // robust caret restore in case the node remounts while typing
  useLayoutEffect(() => {
    if (!labelEditing) return
    const el = textareaRef.current
    const sel = selRef.current
    if (!el || !sel) return

    const restore = () => {
      try {
        el.setSelectionRange(sel.start, sel.end)
      } catch {
        console.warn('Failed to restore selection range')
      }
    }

    restore()
    const id = requestAnimationFrame(restore)
    return () => cancelAnimationFrame(id)
  }, [labelDraft, labelEditing])

  // handlers
  const handleLabelChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value

    // capture selection before any possible remount
    selRef.current = {
      start: event.target.selectionStart ?? next.length,
      end: event.target.selectionEnd ?? next.length
    }

    // 1) update draft so the textarea stays stable
    setLabelDraft(next)

    // 2) also update the graph so other parts of the app see changes live
    setNodes(nds =>
      nds.map(n => {
        if (n.id !== note.id) return n
        const data = n.data as NoteNode['data']
        return {
          ...n,
          data: { ...data, label: { markdown: next } }
        }
      })
    )
  }, [note.id, setNodes])

  const handleNoteChange = useCallback((markdown: string) => {
    setNodes(nds =>
      nds.map(n => {
        if (n.id !== note.id) return n
        const data = n.data as NoteNode['data']
        return { ...n, data: { ...data, content: { markdown } } }
      })
    )
  }, [note.id, setNodes])

  const updateStyle = useCallback((next: Partial<Note['style']>) => {
    setNodes(nds =>
      nds.map(n => {
        if (n.id !== note.id) return n
        const data = n.data as NoteNode['data']
        const prevStyle = data.style as Note['style']
        return { ...n, data: { ...data, style: { ...prevStyle, ...next } } }
      })
    )
  }, [note.id, setNodes])

  const stopDragging = useCallback((e: React.PointerEvent) => {
    if (labelEditing) e.stopPropagation()
  }, [labelEditing])

  const onDoubleClick = useCallback(() => {
    if (isSheet) return
    setLabelEditing(true)
  }, [isSheet])

  const openDialogFromSticky = useCallback(() => {
    setDialogOpen(true)
  }, [setDialogOpen])

  const onTogglePin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setNodes(nds =>
      nds.map(n => {
        if (n.id !== note.id) return n
        const data = n.data as NoteNode['data']
        const props = data.properties as NoteProperties
        const nextPinned = !isPinned
        return {
          ...n,
          data: {
            ...data,
            properties: { ...props, pinned: { type: 'boolean', boolean: nextPinned } }
          }
        }
      })
    )
  }, [isPinned, note.id, setNodes])

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
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className='p-1 text-foreground/60 hover:text-foreground transition-colors'
                  onClick={e => e.stopPropagation()}
                  aria-label='Background color'
                  title='Background color'
                >
                  <HugeiconsIcon icon={PaintBoardIcon} className='size-4 shrink-0' strokeWidth={2} />
                </button>
              </PopoverTrigger>
              <PopoverContent align='end' className='w-auto p-2'>
                <div className='grid grid-cols-6 gap-2'>
                  {TAILWIND_200.map(c => (
                    <button
                      key={c.name}
                      className='h-6 w-6 rounded-full border border-border hover:brightness-95'
                      style={{ backgroundColor: isDark ? darkModeDisplayHex(c.hex) || c.hex : c.hex }}
                      title={`${c.name}-200`}
                      aria-label={`${c.name}-200`}
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
              {isPinned
                ? <HugeiconsIcon icon={PinIcon} className='w-4 h-4 text-secondary' strokeWidth={2} />
                : <HugeiconsIcon icon={PinOffIcon} className='w-4 h-4' strokeWidth={2} />
              }
            </button>

            <button
              className='p-1 text-foreground/60 hover:text-destructive transition-colors'
              onClick={onDelete}
              aria-label='Delete note'
              title='Delete'
            >
              <HugeiconsIcon icon={Delete02Icon} className='w-4 h-4' strokeWidth={2} />
            </button>
          </div>
        )}

        {/* PREVIEW AREA */}
        {isSheet ? (
          <StickyNote content={note.content?.markdown || ''} onOpen={openDialogFromSticky} />
        ) : (
          <Shape
            value={labelEditing ? labelDraft : (note.label?.markdown || '')}
            labelEditing={labelEditing}
            onChange={handleLabelChange}
            textareaRef={textareaRef}
            textAlign={note.style.textAlign}
            styleHelpers={{
              text: textStyleToTwClass(note.style.textStyle),
              font: fontFamilyToTwClass(fontFamily),
              size: fontSizeToTwClass(note.style.fontSize)
            }}
            contentRef={contentRef}
            showPlaceholder={note.style.type === 'text'}
          />
        )}
      </div>

      {/* DIALOG CONTENT */}
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
                <textarea
                  className={titleEditorClass}
                  value={labelEditing ? labelDraft : (note.label?.markdown || '')}
                  onChange={e => setLabelDraft(e.target.value)}
                  placeholder=''
                />
              </div>
            </DialogTitle>
            <DialogDescription className='hidden'>Note description</DialogDescription>
          </DialogHeader>
        )}

        <div className='flex-1 flex items-center w-full h-full min-h-0 min-w-0'>
          <div className='h-full w-full min-w-0 overflow-y-auto overflow-x-hidden scrollbar-thin'>
            <MilkdownProvider>
              <MdEditor markdown={note.content?.markdown || ''} onSave={handleNoteChange} />
            </MilkdownProvider>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}