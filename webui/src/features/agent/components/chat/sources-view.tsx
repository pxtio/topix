import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { LinkPreviewCard } from '../link-preview'
import type { AgentResponse } from '../../types/stream'
import { extractAnswerWebSources } from '../../utils/url'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link04Icon } from '@hugeicons/core-free-icons'

const CARD_WIDTH_PX = 160 // Tailwind w-40
const GAP_PX = 8         // Tailwind gap-2

/**
 * Component that renders a list of sources for a chat response
 * with responsive overflow "+N" that opens a side panel listing all sources.
 */
export const SourcesView = ({ answer }: { answer: AgentResponse }) => {
  const annotations = extractAnswerWebSources(answer)


  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const ro = new ResizeObserver(entries => {
      const cr = entries[0]?.contentRect
      if (cr) setContainerWidth(cr.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { visibleCount, extraCount } = useMemo(() => {
    if (!containerWidth) return { visibleCount: 0, extraCount: annotations.length }

    const perRow = Math.max(1, Math.floor((containerWidth + GAP_PX) / (CARD_WIDTH_PX + GAP_PX)))
    const needsPill = annotations.length > perRow
    const usableSlots = Math.max(1, needsPill ? perRow - 1 : perRow)

    const visible = Math.min(usableSlots, annotations.length)
    const extra = Math.max(0, annotations.length - visible)
    return { visibleCount: visible, extraCount: extra }
  }, [containerWidth, annotations.length])

  if (annotations.length === 0) return null
  const visibleItems = annotations.slice(0, visibleCount)

  return (
    <div className='w-full mt-2 min-w-0'>
      <div className='w-full border-b border-border p-2 flex items-center gap-2'>
        <HugeiconsIcon icon={Link04Icon} className='size-5 shrink-0 text-primary' strokeWidth={1.75} />
        <span className='text-base text-primary font-semibold'>Sources</span>
      </div>

      {/* Root must not overflow its parent */}
      <div ref={containerRef} className='w-full px-2 py-3'>
        <div className='flex items-stretch gap-2 flex-wrap md:flex-nowrap'>
          {visibleItems.map((annotation, index) => (
            <div key={index} className='shrink-0 w-40'>
              <LinkPreviewCard annotation={annotation} className='shadow-xs' />
            </div>
          ))}

          {extraCount > 0 && (
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant='outline'
                  size='sm'
                  className='shrink-0 rounded-lg px-3 h-8 md:h-9 font-medium text-sm bg-card cursor-pointer'
                  title={`Show ${extraCount} more`}
                >
                  +{extraCount}
                </Button>
              </SheetTrigger>
              <SheetContent
                side='right'
                className='w-[min(92vw,680px)] p-0'
              >
                <div className='border-b border-border p-3 flex items-center gap-2'>
                  <HugeiconsIcon icon={Link04Icon} className='size-5 shrink-0 text-primary' strokeWidth={1.75} />
                  <div className='flex flex-col'>
                    <SheetTitle className='text-primary'>Sources</SheetTitle>
                    <SheetDescription className='text-muted-foreground'>
                      These are the links referenced by the answer. Click any card to open the original page.
                    </SheetDescription>
                  </div>
                </div>

                <div className='h-[calc(100vh-4rem)] w-full scrollbar-thin overflow-y-auto'>
                  <div className='p-3 space-y-2 w-full'>
                    {annotations.map((annotation, i) => (
                      <div key={i} className='w-full'>
                        <LinkPreviewCard
                          annotation={annotation}
                          className='w-full'
                          useWideLayoutIfPossible={true}
                          useSmallFontSize={false}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </SheetContent>
              <SheetHeader className='sr-only'>
                {/* keeps a11y happy even though we render custom header above */}
                <SheetTitle>Sources</SheetTitle>
              </SheetHeader>
            </Sheet>
          )}
        </div>
      </div>
    </div>
  )
}