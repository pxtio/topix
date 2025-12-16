// components/flow/node-label.tsx
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Note, NoteProperties } from '../../types/note'
import type { NoteNode } from '../../types/flow'
import { MilkdownProvider } from '@milkdown/react'
import { MdEditor } from '@/components/editor/milkdown'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { clsx } from 'clsx'

import { Shape } from '../notes/shape'
import { darkModeDisplayHex } from '../../lib/colors/dark-variants'
import { fontFamilyToTwClass, fontSizeToTwClass, textStyleToTwClass } from '../../types/style'
import { useGraphStore } from '../../store/graph-store'
import { SheetNodeView } from './sheet-node-view'

export type NoteWithPin = Note & { pinned?: boolean }

type NodeCardProps = {
  note: NoteWithPin
  selected: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  isDark: boolean
  contentRef: React.RefObject<HTMLDivElement | null>
}

export const NodeCard = memo(({
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

  const setNodesPersist = useGraphStore(state => state.setNodesPersist)
  const setEdgesPersist = useGraphStore(state => state.setEdgesPersist)

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
          ? `w-[300px] ${fontFamilyToTwClass(fontFamily)} p-2 pt-8`
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
    setNodesPersist(nds =>
      nds.map(n => {
        if (n.id !== note.id) return n
        const data = n.data as NoteNode['data']
        return {
          ...n,
          data: { ...data, label: { markdown: next } }
        }
      })
    )
  }, [note.id, setNodesPersist])

  const handleNoteChange = useCallback((markdown: string) => {
    setNodesPersist(nds =>
      nds.map(n => {
        if (n.id !== note.id) return n
        const data = n.data as NoteNode['data']
        return { ...n, data: { ...data, content: { markdown } } }
      })
    )
  }, [note.id, setNodesPersist])

  const updateStyle = useCallback((next: Partial<Note['style']>) => {
    setNodesPersist(nds =>
      nds.map(n => {
        if (n.id !== note.id) return n
        const data = n.data as NoteNode['data']
        const prevStyle = data.style as Note['style']
        return { ...n, data: { ...data, style: { ...prevStyle, ...next } } }
      })
    )
  }, [note.id, setNodesPersist])

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
    setNodesPersist(nds =>
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
  }, [isPinned, note.id, setNodesPersist])

  const onDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setNodesPersist(nds => nds.filter(n => n.id !== note.id))
    setEdgesPersist?.(eds => eds.filter(edge => edge.source !== note.id && edge.target !== note.id))
  }, [note.id, setNodesPersist, setEdgesPersist])

  const onPickPalette = useCallback((hex: string) => {
    updateStyle({ backgroundColor: hex })
  }, [updateStyle])

  const icon = useMemo(() => {
    if (note.properties.iconData?.type === "icon" && note.properties.iconData.icon?.type === "icon") {
      return note.properties.iconData.icon.icon
    }
    return undefined
  }, [note.properties.iconData])

  const imageUrl = note.properties.imageUrl?.image?.url

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <div
        className={labelClass}
        onDoubleClick={onDoubleClick}
        onPointerDown={stopDragging}
        style={{ color: textColor || 'inherit' }}
      >
        {isSheet ? (
          <SheetNodeView
            note={note}
            isDark={isDark}
            isPinned={isPinned}
            onPickPalette={onPickPalette}
            onTogglePin={onTogglePin}
            onDelete={onDelete}
            onOpenSticky={openDialogFromSticky}
          />
        ) : (
          <Shape
            nodeType={note.style.type}
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
            icon={icon}
            imageUrl={imageUrl}
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
})
