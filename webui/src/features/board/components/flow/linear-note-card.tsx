// components/flow/linear-note-card.tsx
import { useCallback, useMemo, useState } from 'react'
import type { NoteNode } from '../../types/flow'
import { MarkdownView } from '@/components/markdown/markdown-view'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MilkdownProvider } from '@milkdown/react'
import { MdEditor } from '@/components/editor/milkdown'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useGraphStore } from '../../store/graph-store'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon, PaintBoardIcon, PinIcon, PinOffIcon } from '@hugeicons/core-free-icons'
import clsx from 'clsx'
import { TAILWIND_200 } from '../../lib/colors/tailwind'
import { DialogDescription } from '@radix-ui/react-dialog'
import { formatDistanceToNow } from '../../utils/date'
import { useTheme } from '@/components/theme-provider'
import { darkModeDisplayHex } from '../../lib/colors/dark-variants'


type Props = { node: NoteNode }

export function LinearNoteCard({ node }: Props) {
  const [open, setOpen] = useState(false)

  const boardId = useGraphStore(state => state.boardId)

  const setNodesPersist = useGraphStore(state => state.setNodesPersist)
  const setEdgesPersist = useGraphStore(state => state.setEdgesPersist)

  // dark mode support
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const color = isDark ? darkModeDisplayHex(node.data.style.backgroundColor) ?? '#a5c9ff' : node.data.style.backgroundColor
  const isPinned = node.data.properties.pinned.boolean
  const title = node.data.label?.markdown || ''
  const { text: timeAgo, tooltip: fullDate } = formatDistanceToNow(node.data.updatedAt)

  const onPickColor = useCallback((hex: string) => {
    if (!boardId) return
    const newNode = {
      ...node,
      data: { ...node.data, style: { ...node.data.style, backgroundColor: hex } }
    } as NoteNode
    setNodesPersist(nds =>
      nds.map(n => n.id === node.id ? newNode : n)
    )
  }, [boardId, node, setNodesPersist])

  const onSaveContent = useCallback((markdown: string) => {
    if (!boardId) return
    const newNode = {
      ...node,
      data: { ...node.data, content: { markdown }, updatedAt: new Date().toISOString() }
    } as NoteNode
    setNodesPersist(nds =>
      nds.map(n => n.id === node.id ? newNode : n)
    )
  }, [boardId, node, setNodesPersist])

  const onTogglePin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!boardId) return
    const noteProperties = { ...node.data.properties, pinned: { type: "boolean", boolean: !isPinned } }
    const newNode = { ...node, data: { ...node.data, properties: noteProperties } } as NoteNode
    setNodesPersist(nds =>
      nds.map(n => n.id === node.id ? newNode : n)
    )
  }, [boardId, isPinned, node, setNodesPersist])

  const onDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!boardId) return
    setNodesPersist(nodes => nodes.filter(n => n.id !== node.id))
    setEdgesPersist(edges => edges.filter(e => e.source !== node.id && e.target !== node.id))
  }, [boardId, node.id, setNodesPersist, setEdgesPersist])

  const cardClass = clsx(
    'transition rounded-xl relative bg-background overflow-hidden cursor-pointer transition-all duration-200 group shadow-md',
    isPinned
      ? 'ring-2 ring-secondary/60 border border-transparent shadow-md'
      : 'border border-transparent rounded-none hover:ring-2 hover:ring-secondary/40 hover:border-transparent hover:shadow-lg'
  )

  const CardBody = useMemo(() => (
    <div className={cardClass} style={{ backgroundColor: color }}>
      {/* hover toolbar */}
      <div
        className='absolute top-0 inset-x-0  z-20 rounded-t-xl shadow-xs backdrop-blur-lg transition-opacity'
        style={{ backgroundColor: color}}
      >
        <div className='px-1.5 py-1 w-full h-full flex items-center justify-end gap-1 bg-background/20'>
          <div className='flex flex-row items-center gap-2 px-1'>
            {timeAgo && fullDate && (
              <div className=''>
                <span title={fullDate} className='text-xs text-muted-foreground select-none'>
                  {timeAgo}
                </span>
              </div>
            )}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className='p-1 text-foreground/60 hover:text-foreground transition-colors'
                aria-label='Change background color'
                title='Change background color'
                onClick={e => e.stopPropagation()}
              >
                <HugeiconsIcon icon={PaintBoardIcon} className='size-4 shrink-0' strokeWidth={2} />
              </button>
            </PopoverTrigger>
            <PopoverContent align='start' className='w-auto p-2'>
              <div className='grid grid-cols-6 gap-2'>
                {[{ name: 'white', hex: '#ffffff' }, ...TAILWIND_200].map(c => (
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
      </div>

      {/* content area */}
      <div
        className='p-4 pt-8 md:p-6 md:pt-10 min-h-[100px] max-h-[225px] overflow-x-hidden overflow-y-auto scrollbar-thin text-foreground relative z-10 space-y-1'
        onClick={() => setOpen(!open)}
      >
        {title && (
          <h2 className='text-xl md:text-2xl font-semibold mb-2'>
            {title}
          </h2>
        )}
        <div className='prose dark:prose-invert max-w-none min-w-0 origin-top-left scale-[0.8] w-[125%]'>
          <MarkdownView content={node.data.content?.markdown || ''} />
        </div>
      </div>
    </div>
  ), [cardClass, isPinned, onTogglePin, onDelete, title, node.data.content?.markdown, color, isDark, onPickColor, open, timeAgo, fullDate])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className='relative w-full min-w-0'>
        <div>
          {CardBody}
        </div>
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
