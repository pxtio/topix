import { useMemo } from 'react'
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
import { Link02Icon, Link04Icon } from '@hugeicons/core-free-icons'

/**
 * Compact sources pill that opens a full sources sheet on click.
 */
export const SourcesView = ({ answer }: { answer: AgentResponse }) => {
  const annotations = extractAnswerWebSources(answer)
  const previewFavicons = useMemo(
    () => annotations.slice(0, 3).map((annotation) => annotation.favicon).filter(Boolean) as string[],
    [annotations]
  )

  if (annotations.length === 0) return null

  return (
    <div className='w-full mt-2 min-w-0'>
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant='outline'
            size='sm'
            className='rounded-full !p-2 gap-1 !bg-transparent hover:bg-accent/60 border-border/60 shadow-none mb-1 ml-1'
            title='Open sources'
          >
            <HugeiconsIcon icon={Link04Icon} className='size-4 shrink-0 text-primary' strokeWidth={2} />
            <span className='text-xs font-mono text-primary'>Sources</span>
            <div className='flex items-center -space-x-2'>
              {previewFavicons.length > 0 ? (
                previewFavicons.map((favicon, index) => (
                  <span
                    key={`${favicon}-${index}`}
                    className='size-6 rounded-full border border-background bg-muted overflow-hidden'
                  >
                    <img
                      src={favicon}
                      alt='favicon'
                      loading='lazy'
                      decoding='async'
                      referrerPolicy='no-referrer'
                      className='size-full object-cover'
                    />
                  </span>
                ))
              ) : (
                <span className='size-6 rounded-full border border-background bg-muted inline-flex items-center justify-center'>
                  <HugeiconsIcon icon={Link02Icon} className='size-3 text-muted-foreground' strokeWidth={2} />
                </span>
              )}
              {annotations.length > 3 && (
                <span className='size-6 rounded-full border border-background bg-background inline-flex items-center justify-center text-[10px] font-medium text-muted-foreground'>
                  +{annotations.length - 3}
                </span>
              )}
            </div>
          </Button>
        </SheetTrigger>
        <SheetContent
          side='right'
          className='w-[min(92vw,680px)] p-0'
        >
          <div className='border-b border-border p-3 flex items-center gap-2'>
            <HugeiconsIcon icon={Link04Icon} className='size-5 shrink-0 text-primary' strokeWidth={2} />
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
    </div>
  )
}
