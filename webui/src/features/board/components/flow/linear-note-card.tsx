// components/flow/linear-note-card.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { NoteNode } from '../../types/flow'
import { MarkdownView } from '@/components/markdown/markdown-view'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useGraphStore } from '../../store/graph-store'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon, PaintBoardIcon, PinIcon, PinOffIcon } from '@hugeicons/core-free-icons'
import clsx from 'clsx'
import { TAILWIND_400 } from '../../lib/colors/tailwind'
import { formatDistanceToNow } from '../../utils/date'
import { useTheme } from '@/components/theme-provider'
import { darkModeDisplayHex } from '../../lib/colors/dark-variants'


type Props = { node: NoteNode }

export function LinearNoteCard({ node }: Props) {
  const [titleEditing, setTitleEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState(node.data.label?.markdown || '')
  const titleInputRef = useRef<HTMLInputElement | null>(null)

  const boardId = useGraphStore(state => state.boardId)
  const openNodeSurface = useGraphStore(state => state.openNodeSurface)

  const setNodesPersist = useGraphStore(state => state.setNodesPersist)
  const updateNodeByIdPersist = useGraphStore(state => state.updateNodeByIdPersist)
  const setEdgesPersist = useGraphStore(state => state.setEdgesPersist)

  // dark mode support
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const color = isDark ? darkModeDisplayHex(node.data.style.backgroundColor) ?? '#a5c9ff' : node.data.style.backgroundColor
  const isPinned = node.data.properties.pinned.boolean
  const isSheet = node.data.style.type === 'sheet'
  const isCodeSandbox = node.data.style.type === 'code-sandbox'
  const usesHostedSurface = isSheet || isCodeSandbox
  const title = node.data.label?.markdown?.trim() || ''
  const displayTitle = title || 'Untitled note'
  const { text: timeAgo, tooltip: fullDate } = formatDistanceToNow(node.data.updatedAt)

  useEffect(() => {
    if (titleEditing) return
    setTitleDraft(node.data.label?.markdown || '')
  }, [node.data.label?.markdown, titleEditing])

  const onSaveTitle = useCallback((nextTitle: string) => {
    if (!boardId) return
    const normalizedTitle = nextTitle.trim()
    updateNodeByIdPersist(node.id, prev => ({
      ...prev,
      data: {
        ...prev.data,
        label: normalizedTitle ? { markdown: normalizedTitle } : undefined,
        updatedAt: new Date().toISOString(),
      },
    }))
  }, [boardId, node.id, updateNodeByIdPersist])

  const startTitleEdit = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    setTitleDraft(node.data.label?.markdown || '')
    setTitleEditing(true)
    requestAnimationFrame(() => {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    })
  }, [node.data.label?.markdown])

  const stopTitleEdit = useCallback((save: boolean) => {
    if (save) onSaveTitle(titleDraft)
    else setTitleDraft(node.data.label?.markdown || '')
    setTitleEditing(false)
  }, [node.data.label?.markdown, onSaveTitle, titleDraft])

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

  const handleOpenSurface = useCallback(() => {
    openNodeSurface(node.id, isCodeSandbox ? 'code-sandbox' : 'sheet')
  }, [isCodeSandbox, node.id, openNodeSurface])

  const cardClass = clsx(
    'transition rounded-lg relative bg-background overflow-hidden transition-all duration-200 group sticky-note-shadow paper-note-texture',
    usesHostedSurface && 'cursor-pointer',
    isPinned
      ? 'ring-2 ring-secondary/60'
      : 'hover:ring-2 hover:ring-secondary/40'
  )

  const CardBody = useMemo(() => (
    <div className={cardClass} style={{ backgroundColor: color }}>
      {/* hover toolbar */}
      <div
        className='absolute top-0 inset-x-0 z-20 rounded-t-sm border-b border-foreground/30 pointer-events-none transition-opacity opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto'
        style={{ backgroundColor: color}}
      >
        <div className='px-1.5 py-1 w-full h-full flex items-center justify-end gap-1'>
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
                {[{ name: 'white', hex: '#ffffff' }, ...TAILWIND_400].map(c => (
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
        className='p-2 pt-8 min-h-[100px] max-h-[225px] overflow-x-hidden overflow-y-auto scrollbar-thin text-foreground relative z-10 space-y-1'
        onClick={() => {
          if (usesHostedSurface) {
            handleOpenSurface()
          }
        }}
      >
        {isCodeSandbox ? (
          <pre className='whitespace-pre-wrap break-all font-mono text-sm leading-5 text-foreground/90'>
            {node.data.content?.markdown || '# Write Python here'}
          </pre>
        ) : (
          <div className='prose dark:prose-invert max-w-none min-w-0 origin-top-left scale-[0.64] w-[156.25%]'>
            <MarkdownView content={node.data.content?.markdown || ''} />
          </div>
        )}
      </div>
    </div>
  ), [
    cardClass,
    color,
    fullDate,
    isDark,
    isCodeSandbox,
    isPinned,
    handleOpenSurface,
    node.data.content?.markdown,
    onDelete,
    onPickColor,
    onTogglePin,
    timeAgo,
    usesHostedSurface,
  ])

  const CardShell = (
    <div className='relative w-full min-w-0'>
      <div>
        {CardBody}
      </div>
      <div className='mt-2 px-2'>
        {usesHostedSurface ? (
          <button
            type='button'
            onClick={handleOpenSurface}
            className='block w-full truncate text-center text-sm font-semibold text-foreground hover:underline'
            title={isCodeSandbox ? 'Python sandbox' : displayTitle}
          >
            {isCodeSandbox ? 'Python sandbox' : displayTitle}
          </button>
        ) : titleEditing ? (
          <input
            ref={titleInputRef}
            value={titleDraft}
            onChange={e => setTitleDraft(e.target.value)}
            onBlur={() => stopTitleEdit(true)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                stopTitleEdit(true)
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                stopTitleEdit(false)
              }
            }}
            onClick={e => e.stopPropagation()}
            className='w-full bg-transparent text-center text-sm font-semibold text-foreground border-0 border-b border-foreground/30 focus:border-secondary focus:outline-none px-0 py-0.5'
            placeholder='Untitled note'
          />
        ) : (
          <button
            type='button'
            onClick={startTitleEdit}
            className='block w-full truncate text-center text-sm font-semibold text-foreground hover:underline'
            title={displayTitle}
          >
            {displayTitle}
          </button>
        )}
      </div>
    </div>
  )

  return CardShell
}
