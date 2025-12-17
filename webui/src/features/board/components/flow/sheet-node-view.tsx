import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon, PaintBoardIcon, PinIcon, PinOffIcon } from '@hugeicons/core-free-icons'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

import { StickyNote } from '../notes/sticky-note'
import { TAILWIND_200 } from '../../lib/colors/tailwind'
import { darkModeDisplayHex } from '../../lib/colors/dark-variants'
import type { NoteWithPin } from './note-card'
import { useGraphStore } from '../../store/graph-store'

const RESUME_DELAY = 180
const MIN_HEIGHT = 160
const MAX_HEIGHT = 400

type SheetNodeViewProps = {
  note: NoteWithPin
  isDark: boolean
  isPinned: boolean
  onPickPalette: (hex: string) => void
  onTogglePin: (e: MouseEvent<HTMLButtonElement>) => void
  onDelete: (e: MouseEvent<HTMLButtonElement>) => void
  onOpenSticky: () => void
}

export const SheetNodeView = memo(function SheetNodeView({
  note,
  isDark,
  isPinned,
  onPickPalette,
  onTogglePin,
  onDelete,
  onOpenSticky
}: SheetNodeViewProps) {
  const suspendContent = useGraphStore(
    state => state.isPanning || state.isZooming
  )
  const [hidden, setHidden] = useState(false)
  const resumeTimeoutRef = useRef<number | null>(null)
  const [measuredHeight, setMeasuredHeight] = useState<number>(MIN_HEIGHT)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)

  const targetHeight = useMemo(
    () => Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, measuredHeight)),
    [measuredHeight]
  )

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      if (!entries.length) return
      const height = entries[0].contentRect.height
      setMeasuredHeight(prev => {
        const next = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, height))
        return prev === next ? prev : next
      })
    })
    observer.observe(el)
    observerRef.current = observer
    return () => {
      observer.disconnect()
      observerRef.current = null
    }
  }, [note.content?.markdown])

  useEffect(() => {
    if (suspendContent) {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current)
        resumeTimeoutRef.current = null
      }
      setHidden(true)
      return
    }
    resumeTimeoutRef.current = window.setTimeout(() => {
      setHidden(false)
      resumeTimeoutRef.current = null
    }, RESUME_DELAY)

    return () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current)
        resumeTimeoutRef.current = null
      }
    }
  }, [suspendContent])

  return (
    <>
      <div className='absolute top-0 inset-x-0 py-1 px-2 flex flex-row items-center gap-1 z-40 justify-end border-b border-foreground/10'>
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
              {[{ name: 'white', hex: '#ffffff' }, ...TAILWIND_200].map(c => (
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

      <div
        className='w-full overflow-y-auto scrollbar-thin cursor-pointer'
        style={{ minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT, height: targetHeight }}
        onClick={onOpenSticky}
      >
        {hidden ? (
          <div className='w-full h-full' aria-hidden='true' />
        ) : (
          <div ref={contentRef}>
            <StickyNote content={note.content?.markdown || ''} />
          </div>
        )}
      </div>
    </>
  )
})
