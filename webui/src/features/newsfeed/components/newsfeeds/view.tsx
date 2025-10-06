import { useEffect, useMemo, useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { useListNewsfeeds } from '@/features/newsfeed/api/list-newsfeeds'
import { useGetNewsfeed } from '@/features/newsfeed/api/get-newsfeed'
import { MarkdownView } from '@/components/markdown/markdown-view'
import { ErrorWindow, ProgressBar } from '@/components/progress-bar'
import type { ViewMode } from '../../types/newsfeeds-view'
import { TopViewPanel } from './top-panel'
import { NewsletterCard } from './card'
import { NewsfeedGrid } from './grid'
import type { UrlAnnotation } from '@/features/agent/types/tool-outputs'

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
  const currentId = viewMode !== 'history' ? (selectedId ?? latestId) : undefined
  const currentFeed = useGetNewsfeed(subId, currentId)
  const markdown = currentFeed.data?.content?.markdown ?? ''

  const openFromGrid = (id: string) => {
    setSelectedId(id)
    setViewMode('linear')
    // scroll to top for a nice transition
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  }

  const annotations: UrlAnnotation[] = useMemo(() => {
    console.log(currentFeed.data?.properties)
    return (currentFeed.data?.properties?.newsGrid?.sources || []) as UrlAnnotation[]
  }, [currentFeed.data?.properties])

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

        {viewMode === 'grid' && currentId && (
          <div className='w-full absolute inset-0 overflow-x-hidden overflow-y-auto scrollbar-thin'>
            <div className='mx-auto max-w-[1100px] space-y-3 px-2'>
              {currentFeed.isLoading && (
                <ProgressBar message='Loading…' viewMode='full' className='bg-transparent' />
              )}
              {currentFeed.isError && (
                <ErrorWindow message='Failed to load newsfeed' viewMode='full' className='bg-transparent' />
              )}

              {annotations.length > 0 ? (
                <NewsfeedGrid annotations={annotations} />
              ) : (
                <div className='text-center text-sm text-muted-foreground py-8'>
                  No links in this newsfeed
                </div>
              )}
            </div>
          </div>
        )}

        {!feedsQuery.isLoading && sorted.length === 0 && (
          <div className='text-center text-sm text-muted-foreground'>No newsletters yet</div>
        )}
      </div>
    </div>
  )
}