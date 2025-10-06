import { useEffect, useMemo, useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { useListNewsfeeds } from '@/features/newsfeed/api/list-newsfeeds'
import { useGetNewsfeed } from '@/features/newsfeed/api/get-newsfeed'
import { MarkdownView } from '@/components/markdown/markdown-view'
import { Button } from '@/components/ui/button'
import { ErrorWindow, ProgressBar } from '@/components/progress-bar'
import { formatNewsletterDate } from '../../utils/date'
import type { ViewMode } from '../../types/newsfeeds-view'
import { TopViewPanel } from './top-panel'
import { NewsletterCard } from './card'

export function NewsfeedsView() {
  const { id } = useParams({ from: '/subscriptions/$id', shouldThrow: false })
  const subId = id as string | undefined

  const feedsQuery = useListNewsfeeds(subId)

  const sorted = useMemo(() => {
    const feeds = feedsQuery.data ?? []
    return feeds.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [feedsQuery.data])

  const latestId = sorted[0]?.id

  // selection + mode
  const [viewMode, setViewMode] = useState<ViewMode>('history')
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)

  // choose default after load
  useEffect(() => {
    if (!feedsQuery.isLoading) {
      setViewMode(latestId ? 'linear' : 'history')
      setSelectedId(undefined)
    }
  }, [feedsQuery.isLoading, latestId])

  // fetch content for linear view (selected or latest)
  const currentId = viewMode === 'linear' ? (selectedId ?? latestId) : undefined
  const currentFeed = useGetNewsfeed(subId, currentId)
  const markdown = currentFeed.data?.content?.markdown ?? ''

  const openFromGrid = (id: string) => {
    setSelectedId(id)
    setViewMode('linear')
    // scroll to top for a nice transition
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  }

  return (
    <div className='relative w-full h-full'>
      <TopViewPanel
        viewMode={viewMode}
        setViewMode={m => {
          setViewMode(m)
          if (m === 'history') setSelectedId(undefined)
        }}
        hasLatest={!!latestId}
      />

      <div className='w-full h-full p-6 pt-16 space-y-6 relative'>
        <div className='text-center'>
          <h1 className='text-xl text-secondary font-semibold'>Newsletters</h1>
        </div>

        {feedsQuery.isLoading && (
          <div className='text-center text-sm text-muted-foreground'>Loading…</div>
        )}
        {feedsQuery.isError && (
          <div className='text-center text-sm text-destructive'>Failed to load newsletters</div>
        )}

        {viewMode === 'linear' && currentId && (
          <div className='w-full absolute inset-0 overflow-x-hidden overflow-y-auto scrollbar-thin'>
            <div className='mx-auto max-w-[900px] space-y-3'>
              <div className='flex items-center justify-between text-xs text-muted-foreground'>
                <span>
                  {selectedId
                    ? `Viewing: ${formatNewsletterDate(
                        sorted.find(f => f.id === selectedId)?.createdAt ?? ''
                      )}`
                    : `Latest newsletter`}
                </span>
                <Button variant='ghost' size='sm' onClick={() => setViewMode('history')}>
                  History
                </Button>
              </div>

              {currentFeed.isLoading && (
                <ProgressBar message='Loading…' viewMode='full' className='bg-transparent' />
              )}
              {currentFeed.isError && (
                <ErrorWindow message='Failed to load newsfeed' viewMode='full' className='bg-transparent' />
              )}
              {markdown && (
                <div className='prose max-w-[800px] mx-auto'>
                  <MarkdownView content={markdown} />
                </div>
              )}
            </div>
          </div>
        )}

        {(viewMode === 'history' || (!latestId && !feedsQuery.isLoading)) && (
          <div className='mx-auto max-w-4xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {sorted.map(feed => (
              <NewsletterCard
                key={feed.id}
                createdAt={feed.createdAt}
                active={feed.id === selectedId}
                onClick={() => openFromGrid(feed.id)}
              />
            ))}
          </div>
        )}

        {!feedsQuery.isLoading && sorted.length === 0 && (
          <div className='text-center text-sm text-muted-foreground'>No newsletters yet</div>
        )}
      </div>
    </div>
  )
}