// components/flow/node-label.tsx
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Note, NoteProperties } from '../../types/note'
import type { NoteNode } from '../../types/flow'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { clsx } from 'clsx'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

import { Shape } from '../notes/shape'
import { darkModeDisplayHex } from '../../lib/colors/dark-variants'
import { fontFamilyToTwClass, fontSizeToTwClass, textStyleToTwClass } from '../../types/style'
import { useGraphStore } from '../../store/graph-store'
import { SheetNodeView } from './sheet-node-view'
import { SheetEditor } from '../sheet/sheet-editor'
import { SheetUrl } from '@/routes'
import { HugeiconsIcon } from '@hugeicons/react'
import { LinkSquare02Icon, Cancel01Icon } from '@hugeicons/core-free-icons'

export type NoteWithPin = Note & { pinned?: boolean; autoEdit?: boolean }

/**
 * Props for the root node card renderer used inside a flow node.
 */
type NodeCardProps = {
  note: NoteWithPin
  selected: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onLabelEditingChange?: (editing: boolean) => void
  isDark: boolean
  contentRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Shared wrapper props for the note label container.
 */
type LabelContainerProps = {
  className: string
  textColor?: string
  onDoubleClick: () => void
  onPointerDown: (e: React.PointerEvent) => void
  children: React.ReactNode
}

/**
 * Generic label wrapper used by both sheet and non-sheet node content.
 */
const LabelContainer = memo(function LabelContainer({
  className,
  textColor,
  onDoubleClick,
  onPointerDown,
  children,
}: LabelContainerProps) {
  return (
    <div
      className={className}
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      style={{ color: textColor || 'inherit' }}
    >
      {children}
    </div>
  )
})

/**
 * Props for rendering non-sheet note display content.
 */
type NoteDisplayContentProps = {
  note: NoteWithPin
  labelEditing: boolean
  labelDraft: string
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onLabelChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  contentRef: React.RefObject<HTMLDivElement | null>
  textColor?: string
}

/**
 * Display-only renderer for note content (shape + label markdown or editor).
 */
const NoteDisplayContent = memo(function NoteDisplayContent({
  note,
  labelEditing,
  labelDraft,
  textareaRef,
  onLabelChange,
  contentRef,
  textColor,
}: NoteDisplayContentProps) {
  const fontFamily = note.style.type === 'sheet' ? 'sans-serif' : note.style.fontFamily
  const icon = note.properties.iconData?.type === "icon" && note.properties.iconData.icon?.type === "icon"
    ? note.properties.iconData.icon.icon
    : undefined
  const imageUrl = note.properties.imageUrl?.image?.url
  const renderWidth = note.properties.nodeSize?.size?.width
  const renderHeight = note.properties.nodeSize?.size?.height

  return (
    <Shape
      nodeType={note.style.type}
      value={labelEditing ? labelDraft : (note.label?.markdown || '')}
      labelEditing={labelEditing}
      onChange={onLabelChange}
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
      renderWidth={renderWidth}
      renderHeight={renderHeight}
      renderTextColor={textColor}
      renderFontFamily={note.style.fontFamily}
      renderFontSize={note.style.fontSize}
      renderTextStyle={note.style.textStyle}
    />
  )
})

/**
 * Props for the sheet modal content area.
 */
type SheetDialogContentProps = {
  value: string
  onSave: (markdown: string) => void
  onOpenFullView: () => void
  onClose: () => void
}

/**
 * Sheet dialog body with toolbar actions and editor content.
 */
const SheetDialogContent = memo(function SheetDialogContent({
  value,
  onSave,
  onOpenFullView,
  onClose,
}: SheetDialogContentProps) {
  return (
    <DialogContent className='sm:max-w-4xl h-3/4 flex flex-col items-center text-left p-2' showCloseButton={false}>
      <div className='w-full flex items-center justify-end gap-2 px-2 pt-1'>
        <DialogTitle className="sr-only">Sheet</DialogTitle>
        <Button
          variant={'ghost'}
          size='icon-sm'
          onClick={onOpenFullView}
          title='Open full view'
          aria-label='Open full view'
        >
          <HugeiconsIcon icon={LinkSquare02Icon} className="size-4" strokeWidth={2} />
        </Button>
        <Button
          variant='ghost'
          size='icon-sm'
          onClick={onClose}
          title='Close'
          aria-label='Close'
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-4" strokeWidth={2} />
        </Button>
      </div>

      <div className='flex-1 flex items-center w-full h-full min-h-0 min-w-0'>
        <div className='h-full w-full min-w-0 overflow-y-auto overflow-x-hidden scrollbar-thin'>
          <SheetEditor
            value={value}
            onSave={onSave}
          />
        </div>
      </div>
    </DialogContent>
  )
})

/**
 * NodeCard: orchestrates note rendering, in-place editing, and sheet dialog behavior.
 */
export const NodeCard = memo(({
  note,
  selected,
  open,
  onOpenChange,
  onLabelEditingChange,
  isDark,
  contentRef
}: NodeCardProps) => {
  const isSheet = note.style.type === 'sheet'
  const isText = note.style.type === 'text'
  const navigate = useNavigate()

  const [internalOpen, setInternalOpen] = useState(false)
  const dialogOpen = isSheet ? (typeof open === 'boolean' ? open : internalOpen) : false

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
          ? `w-[360px] ${fontFamilyToTwClass(fontFamily)} p-2 pt-8`
          : isText
          ? 'w-full h-full p-0'
          : 'w-full h-full p-1'
      ),
    [isSheet, isText, fontFamily]
  )

  const setDialogOpen = useCallback(
    (v: boolean) => {
      if (!isSheet) return
      if (typeof open === 'boolean') onOpenChange?.(v)
      else setInternalOpen(v)
    },
    [isSheet, open, onOpenChange]
  )

  // keep draft in sync when not editing or when external value changes
  useEffect(() => {
    if (!labelEditing) setLabelDraft(note.label?.markdown || '')
  }, [labelEditing, note.label?.markdown])

  // notify parent when label edit mode changes
  useEffect(() => {
    onLabelEditingChange?.(labelEditing)
  }, [labelEditing, onLabelEditingChange])

  // leave editing state if deselected or dialog is closed by selection change
  useEffect(() => {
    if (!selected) {
      setLabelEditing(false)
      setDialogOpen(false)
    }
  }, [selected, setDialogOpen])

  useEffect(() => {
    if (!isText || !note.autoEdit) return
    setLabelEditing(true)
    setNodesPersist(nds =>
      nds.map(n => {
        if (n.id !== note.id) return n
        const data = n.data as NoteNode['data']
        return { ...n, data: { ...data, autoEdit: false } }
      })
    )
  }, [isText, note.autoEdit, note.id, setNodesPersist])

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

  const handleOpenFullView = useCallback(() => {
    if (!note.graphUid) return
    navigate({ to: SheetUrl, params: { id: note.graphUid, noteId: note.id } })
  }, [navigate, note.graphUid, note.id])

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

  if (!isSheet) {
    return (
      <LabelContainer
        className={labelClass}
        textColor={textColor}
        onDoubleClick={onDoubleClick}
        onPointerDown={stopDragging}
      >
        <NoteDisplayContent
          note={note}
          labelEditing={labelEditing}
          labelDraft={labelDraft}
          onLabelChange={handleLabelChange}
          textareaRef={textareaRef}
          contentRef={contentRef}
          textColor={textColor}
        />
      </LabelContainer>
    )
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <LabelContainer
        className={labelClass}
        textColor={textColor}
        onDoubleClick={onDoubleClick}
        onPointerDown={stopDragging}
      >
        <SheetNodeView
          note={note}
          isDark={isDark}
          isPinned={isPinned}
          onPickPalette={onPickPalette}
          onTogglePin={onTogglePin}
          onDelete={onDelete}
          onOpenSticky={openDialogFromSticky}
        />
      </LabelContainer>

      <SheetDialogContent
        value={note.content?.markdown || ''}
        onSave={handleNoteChange}
        onOpenFullView={handleOpenFullView}
        onClose={() => setDialogOpen(false)}
      />
    </Dialog>
  )
})
