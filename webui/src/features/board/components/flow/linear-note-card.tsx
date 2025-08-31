// components/flow/linear-note-card.tsx
import { useCallback, useMemo, useState } from 'react'
import type { NoteNode } from '../../types/flow'
import { MarkdownView } from '@/components/markdown-view'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MilkdownProvider } from '@milkdown/react'
import { MdEditor } from '@/components/editor/milkdown'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useGraphStore } from '../../store/graph-store'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon, PinIcon, PinOffIcon } from '@hugeicons/core-free-icons'
import clsx from 'clsx'
import { TAILWIND_100 } from '../../lib/colors/tailwind'

type Props = { node: NoteNode }

export function LinearNoteCard({ node }: Props) {
  const [open, setOpen] = useState(false)
  const setStore = useGraphStore.setState

  const color = node.data.style.backgroundColor ?? '#a5c9ff'
  const textColor = node.data.style.textColor ?? undefined
  const isPinned = !!node.data.pinned
  const title = node.data.label?.markdown || ''

  const onPickColor = useCallback((hex: string) => {
    setStore(state => {
      const next = state.nodes.map(n =>
        n.id === node.id
          ? ({
              ...n,
              data: {
                ...n.data,
                style: { ...n.data.style, backgroundColor: hex }
              }
            } as NoteNode)
          : n
      )
      return { ...state, nodes: next }
    })
  }, [node.id, setStore])

  const onSaveContent = useCallback((markdown: string) => {
    setStore(state => {
      const next = state.nodes.map(n =>
        n.id === node.id
          ? ({
              ...n,
              data: {
                ...n.data,
                content: { markdown },
                updatedAt: new Date().toISOString()
              }
            } as NoteNode)
          : n
      )
      return { ...state, nodes: next }
    })
  }, [node.id, setStore])

  const onTogglePin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setStore(state => {
      const next = state.nodes.map(n =>
        n.id === node.id
          ? ({ ...n, data: { ...n.data, pinned: !isPinned } } as NoteNode)
          : n
      )
      return { ...state, nodes: next }
    })
  }, [node.id, isPinned, setStore])

  const onDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setStore(state => {
      const nodes = state.nodes.filter(n => n.id !== node.id)
      const edges = state.edges.filter(e => e.source !== node.id && e.target !== node.id)
      return { ...state, nodes, edges }
    })
  }, [node.id, setStore])

  const cardClass = clsx(
    'relative rounded-xl bg-background overflow-hidden cursor-pointer transition-all duration-200 group',
    isPinned
      ? 'ring-2 ring-primary/60 border border-transparent shadow-md'
      : 'border border-border hover:ring-2 hover:ring-primary/40 hover:border-transparent hover:shadow-md'
  )

  const CardBody = useMemo(() => (
    <div className={cardClass} style={{ color: textColor }}>
      {/* top-right toolbar (appears on hover, always visible when pinned) */}
      <div className={clsx(
        'absolute top-0 right-0 px-1.5 py-1 flex items-center gap-1 border-b border-l border-border bg-background/70 rounded-bl-xl backdrop-blur-sm transition-opacity z-20',
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

      {/* gradient fade at bottom */}
      <div className='pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent' />

      {/* content area with max height and fade */}
      <div className='p-4 md:p-6 pt-8 md:pt-10 max-h-[200px] overflow-hidden text-foreground'>
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
  ), [cardClass, isPinned, onDelete, onTogglePin, node.data.content?.markdown, textColor, title])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className='relative'>
        {/* color dot with popover palette */}
        <div className='absolute left-2 top-2 z-50'>
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
                {TAILWIND_100.map(c => (
                  <button
                    key={c.name}
                    className='h-6 w-6 rounded-md border border-border hover:brightness-95'
                    style={{ backgroundColor: c.hex }}
                    title={`${c.name}-100`}
                    aria-label={`${c.name}-100`}
                    onClick={() => onPickColor(c.hex)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* open dialog when clicking the card */}
        <DialogTrigger asChild>
          <div onClick={() => setOpen(true)}>
            {CardBody}
          </div>
        </DialogTrigger>
      </div>

      {/* full editor dialog */}
      <DialogContent className='sm:max-w-4xl h-3/4 flex flex-col items-center text-left p-2'>
        <DialogHeader className='invisible'>
          <DialogTitle />
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
