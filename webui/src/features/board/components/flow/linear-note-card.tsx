// components/flow/linear-note-card.tsx
import { useCallback, useMemo, useState } from 'react'
import type { NoteNode } from '../../types/flow'
import { MarkdownView } from '@/components/markdown/markdown-view'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { MilkdownProvider } from '@milkdown/react'
import { MdEditor } from '@/components/editor/milkdown'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useGraphStore } from '../../store/graph-store'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon, PinIcon, PinOffIcon } from '@hugeicons/core-free-icons'
import clsx from 'clsx'
import { TAILWIND_200 } from '../../lib/colors/tailwind'
import { DialogDescription } from '@radix-ui/react-dialog'
import { useRemoveNote } from '../../api/remove-note'
import { useRemoveLink } from '../../api/remove-link'
import { useUpdateNote } from '../../api/update-note'
import { useAppStore } from '@/store'
import { formatDistanceToNow } from '../../utils/date'
import { useTheme } from '@/components/theme-provider'
import { darkModeDisplayHex } from '../../lib/colors/dark-variants'
import { buildFadeMaskStyle, buildSubtleHueGradient } from '../../utils/color'

type Props = { node: NoteNode }

export function LinearNoteCard({ node }: Props) {
  const [open, setOpen] = useState(false)

  const setStore = useGraphStore.setState
  const userId = useAppStore(state => state.userId)
  const boardId = useGraphStore(state => state.boardId)

  const { updateNote } = useUpdateNote()
  const { removeNote } = useRemoveNote()
  const { removeLink } = useRemoveLink()

  // dark mode support
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const color = isDark ? darkModeDisplayHex(node.data.style.backgroundColor) ?? '#a5c9ff' : node.data.style.backgroundColor
  const isPinned = node.data.properties.pinned.boolean
  const title = node.data.label?.markdown || ''
  const { text: timeAgo, tooltip: fullDate } = formatDistanceToNow(node.data.updatedAt)

  const gradientBg = useMemo(() => buildSubtleHueGradient(color, resolvedTheme), [color, resolvedTheme])

  const onPickColor = useCallback((hex: string) => {
    if (!boardId) return
    const newNode = {
      ...node,
      data: { ...node.data, style: { ...node.data.style, backgroundColor: hex } }
    } as NoteNode
    setStore(state => ({ ...state, nodes: state.nodes.map(n => n.id === node.id ? newNode : n) }))
    updateNote({ boardId, userId, noteId: node.data.id, noteData: newNode.data })
  }, [boardId, node, setStore, updateNote, userId])

  const onSaveContent = useCallback((markdown: string) => {
    if (!boardId) return
    const newNode = {
      ...node,
      data: { ...node.data, content: { markdown }, updatedAt: new Date().toISOString() }
    } as NoteNode
    setStore(state => ({ ...state, nodes: state.nodes.map(n => n.id === node.id ? newNode : n) }))
    updateNote({ boardId, userId, noteId: node.data.id, noteData: newNode.data })
  }, [boardId, node, setStore, updateNote, userId])

  const onTogglePin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!boardId) return
    const noteProperties = { ...node.data.properties, pinned: { type: "boolean", boolean: !isPinned } }
    const newNode = { ...node, data: { ...node.data, properties: noteProperties } } as NoteNode
    setStore(state => ({ ...state, nodes: state.nodes.map(n => n.id === node.id ? newNode : n) }))
    updateNote({ boardId, userId, noteId: node.data.id, noteData: newNode.data })
  }, [boardId, isPinned, node, setStore, updateNote, userId])

  const onDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!boardId || !userId) return
    setStore(state => {
      const nodes = state.nodes.filter(n => n.id !== node.id)
      const edges = state.edges.filter(e => e.source !== node.id && e.target !== node.id)
      const toDeleteNodeId = node.data.id
      const toDeleteEdgeIds = edges
        .filter(e => e.source === toDeleteNodeId || e.target === toDeleteNodeId)
        .map(e => e.id)
      removeNote({ boardId, userId, noteId: toDeleteNodeId })
      toDeleteEdgeIds.forEach(edgeId => removeLink({ boardId, userId, linkId: edgeId }))
      return { ...state, nodes, edges }
    })
  }, [boardId, node.data.id, node.id, removeLink, removeNote, setStore, userId])

  const cardClass = clsx(
    'rounded-xl relative bg-background overflow-hidden cursor-pointer transition-all duration-200 group',
    isPinned
      ? 'ring-2 ring-secondary/60 border border-transparent shadow-md'
      : 'border border-transparent rounded-none hover:ring-2 hover:ring-secondary/40 hover:border-transparent hover:shadow-md'
  )

  const CardBody = useMemo(() => (
    <div className={cardClass}>
      {/* hue gradient overlay — light: multiply, dark: screen */}
      <div
        className='absolute inset-0 pointer-events-none mix-blend-multiply dark:mix-blend-screen opacity-[0.22] dark:opacity-[0.35]'
        style={{ backgroundImage: gradientBg }}
      />
      {/* hover toolbar */}
      <div className={clsx(
        'absolute top-0 right-0 px-1.5 py-1 flex items-center gap-1 border-b border-l border-border bg-background/70 rounded-bl-xl backdrop-blur-sm transition-opacity z-20 rounded-tr-xl',
        isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      )}>
        <button
          className='p-1 text-foreground/60 hover:text-foreground transition-colors'
          onClick={onTogglePin}
          aria-label='Toggle pin'
          title='Pin/Unpin'
        >
          {isPinned
            ? <HugeiconsIcon icon={PinIcon} className='w-4 h-4 text-secondary' strokeWidth={1.75} />
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

      {/* content area with MASK fade at the bottom (no background painting) */}
      <div
        className='p-4 pt-8 md:p-6 md:pt-10 mb-12 min-h-[100px] max-h-[225px] overflow-hidden text-foreground relative z-10 space-y-1'
        style={buildFadeMaskStyle({ solidUntil: 90 })}
      >
        {title && (
          <h2 className='text-xl md:text-2xl font-semibold mb-2'>
            {title}
          </h2>
        )}
        <div className='prose dark:prose-invert max-w-none min-w-0'>
          <MarkdownView content={node.data.content?.markdown || ''} />
        </div>
      </div>
    </div>
  ), [cardClass, isPinned, onTogglePin, onDelete, title, node.data.content?.markdown, gradientBg])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className='relative w-full min-w-0'>
        <div className='absolute inset-x-0 -bottom-2 h-0 border-b border-muted-foreground/50 border-dashed' />
        {/* color dot & palette */}
        <div className='absolute left-6 bottom-4 z-50 flex flex-row items-center gap-2'>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className='h-4 w-4 rounded-full ring-2 ring-secondary/40 shadow hover:brightness-95 transition'
                style={{ backgroundColor: color }}
                aria-label='Change background color'
                title='Change background color'
                onClick={e => e.stopPropagation()}
              />
            </PopoverTrigger>
            <PopoverContent align='start' className='w-auto p-2'>
              <div className='grid grid-cols-6 gap-2'>
                {TAILWIND_200.map(c => (
                  <button
                    key={c.name}
                    className='h-6 w-6 rounded-md border border-border hover:brightness-95'
                    style={{ backgroundColor: isDark ? darkModeDisplayHex(c.hex) || c.hex : c.hex }}
                    title={`${c.name}-100`}
                    aria-label={`${c.name}-100`}
                    onClick={() => onPickColor(c.hex)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          {timeAgo && fullDate && (
            <div>
              <span title={fullDate} className='text-xs text-muted-foreground select-none'>
                {timeAgo}
              </span>
            </div>
          )}
        </div>

        <DialogTrigger asChild>
          <div onClick={() => setOpen(true)}>
            {CardBody}
          </div>
        </DialogTrigger>
      </div>

      <DialogContent className='sm:max-w-4xl h-3/4 flex flex-col items-center text-left p-2'>
        <DialogHeader className='hidden'>
          <DialogTitle />
          <DialogDescription />
        </DialogHeader>

        <div className='flex-1 flex items-center w-full h-full min-h-0 min-w-0'>
          <div className='h-full w-full min-w-0 overflow-y-auto overflow-x-hidden scrollbar-thin'>
            <MilkdownProvider>
              <MdEditor markdown={node.data.content?.markdown || ''} onSave={onSaveContent} />
            </MilkdownProvider>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
