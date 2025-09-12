// components/flow/linear-note-card.tsx
import { useCallback, useMemo, useState } from 'react'
import type { NoteNode } from '../../types/flow'
import { MarkdownView } from '@/components/markdown/markdown-view'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
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

type Props = { node: NoteNode }

/* ---------- color & gradient helpers ---------- */
function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n))
}
function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean
  const num = parseInt(full, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  const d = max - min
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}
function buildSubtleHueGradient(hex: string) {
  let h = 215, s = 60, l = 70
  try {
    const { r, g, b } = hexToRgb(hex)
    const hsl = rgbToHsl(r, g, b)
    h = hsl.h
    s = hsl.s
    l = hsl.l
  } catch { /* empty */ }

  const s1 = clamp(s * 1.05)
  const l1 = clamp(l * 1.10)
  const s2 = clamp(s * 0.9)
  const l2 = clamp(l * 0.90)
  const l3 = clamp(l - 12)

  // dialed-down alphas — base gradient is softer
  const radial = `radial-gradient(1000px 600px at 15% 0%, hsla(${h} ${s1}% ${l1}% / 0.14), transparent 55%)`
  const linear = `linear-gradient(135deg,
    hsla(${h} ${s}% ${l}% / 0.06) 0%,
    hsla(${h} ${s2}% ${l2}% / 0.14) 45%,
    hsla(${h} ${s}% ${l3}% / 0.10) 100%)`
  return `${radial}, ${linear}`
}

/* ---------- fade mask helper (no background painting) ---------- */
function buildFadeMaskStyle(stops: { solidUntil?: number } = {}) {
  const solid = stops.solidUntil ?? 75
  const mask = `linear-gradient(to bottom, rgba(0,0,0,1) ${solid}%, rgba(0,0,0,0) 100%)`
  return {
    WebkitMaskImage: mask,
    maskImage: mask
  } as React.CSSProperties
}

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
  const isPinned = !!node.data.properties.pinned.boolean
  const title = node.data.label?.markdown || ''
  const { text: timeAgo, tooltip: fullDate } = formatDistanceToNow(node.data.updatedAt)

  const gradientBg = useMemo(() => buildSubtleHueGradient(color), [color])

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
      ? 'ring-2 ring-primary/60 border border-transparent shadow-md'
      : 'border border-transparent rounded-none hover:ring-2 hover:ring-primary/40 hover:border-transparent hover:shadow-md'
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

      {/* content area with MASK fade at the bottom (no background painting) */}
      <div
        className='p-4 md:p-6 mb-12 min-h-[100px] max-h-[225px] overflow-hidden text-foreground relative z-10 space-y-1'
        style={buildFadeMaskStyle({ solidUntil: 90 })}
      >
        {title && (
          <h2 className='text-xl md:text-2xl font-semibold mb-2'>
            {title}
          </h2>
        )}
        <div className='prose dark:prose-invert max-w-none'>
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
                className='h-4 w-4 rounded-full ring-2 ring-primary/40 shadow hover:brightness-95 transition'
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

        <div className='min-h-0 flex-1 flex items-center w-full'>
          <ScrollArea className='h-full w-full'>
            <MilkdownProvider>
              <MdEditor markdown={node.data.content?.markdown || ''} onSave={onSaveContent} />
            </MilkdownProvider>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
