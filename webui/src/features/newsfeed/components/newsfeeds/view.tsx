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
import { CreateNewsfeedTile } from './create-new'
import { useQueryClient } from '@tanstack/react-query'
import { newsfeedsKey } from '../../api/query-keys'

/**
 * The main view for newsfeeds, supporting 3 modes:
 * - Linear: show one newsfeed in full markdown
 * - Grid: show one newsfeed in a grid of link previews
 * - History: show all newsfeeds as cards to pick from
 */
export function NewsfeedsView() {
  const { id } = useParams({ from: '/subscriptions/$id', shouldThrow: false })
  const subId = id as string | undefined

  const qc = useQueryClient()
  const feedsQuery = useListNewsfeeds(subId)

  const sorted = useMemo(() => {
    const feeds = feedsQuery.data ?? []
    return feeds.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [feedsQuery.data])

  const latestId = sorted[0]?.id

  // view + selection
  const [viewMode, setViewMode] = useState<ViewMode>('history')
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)

  // ensure default is chosen only once (avoid redirects on refetch)
  const [didSetDefault, setDidSetDefault] = useState(false)
  useEffect(() => {
    if (didSetDefault) return
    if (!feedsQuery.isLoading) {
      setViewMode(latestId ? 'linear' : 'history')
      setSelectedId(undefined)
      setDidSetDefault(true)
    }
  }, [feedsQuery.isLoading, latestId, didSetDefault])

  // pending id (optimistic creation) → show generating state on that item & poll only it
  const [pendingId, setPendingId] = useState<string | undefined>(undefined)
  const pendingFeed = useGetNewsfeed(subId, pendingId)

  // poll pending item
  useEffect(() => {
    if (!pendingId) return
    const t = setInterval(() => pendingFeed.refetch(), 2500)
    return () => clearInterval(t)
  }, [pendingId]) // eslint-disable-line

  // when pending item is ready, clear and refresh list
  useEffect(() => {
    if (!pendingId) return
    const ready = !!pendingFeed.data?.content?.markdown
    if (ready) {
      setPendingId(undefined)
      if (subId) qc.invalidateQueries({ queryKey: newsfeedsKey(subId) })
    }
  }, [pendingId, pendingFeed.data?.content, subId, qc])

  // fetch content for linear/grid (selected or latest)
  const currentId = viewMode !== 'history' ? (selectedId ?? latestId) : undefined
  const currentFeed = useGetNewsfeed(subId, currentId)
  const markdown = currentFeed.data?.content?.markdown ?? ''

  const openFromGrid = (id: string) => {
    setSelectedId(id)
    setViewMode('linear')
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  }

  const annotations: UrlAnnotation[] = useMemo(() => {
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

      <div className='w-full h-full p-6 space-y-4 relative'>
        {feedsQuery.isLoading && (
          <ProgressBar message='Loading newsletters…' viewMode='full' className='bg-transparent' />
        )}
        {feedsQuery.isError && (
          <ErrorWindow message='Failed to load newsletters' viewMode='full' className='bg-transparent' />
        )}

        {/* LINEAR */}
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
                <div className='prose max-w-[800px] mx-auto p-4 pt-16 pb-16'>
                  <div className='text-center mt-16'>
                    <h1 className='text-xl text-secondary font-semibold'>Newsletter</h1>
                  </div>
                  <MarkdownView content={markdown} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* HISTORY */}
        {(viewMode === 'history' || (!latestId && !feedsQuery.isLoading)) && (
          <div className='mx-auto max-w-4xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto scrollbar-thin pt-16 pb-16'>
            <CreateNewsfeedTile
              subscriptionId={subId}
              onStart={uid => {
                // stay on history, mark as pending so the optimistic item pulses
                setViewMode('history')
                setPendingId(uid)
              }}
            />

            {sorted.map(feed => (
              <NewsletterCard
                key={feed.id}
                id={feed.id}
                subscriptionId={subId!}
                createdAt={feed.createdAt}
                active={feed.id === selectedId}
                generating={feed.id === pendingId}
                onClick={() => openFromGrid(feed.id)}
              />
            ))}
          </div>
        )}

        {/* GRID */}
        {viewMode === 'grid' && currentId && (
          <div className='w-full absolute inset-0 overflow-x-hidden overflow-y-auto scrollbar-thin p-2 pt-16 pb-16'>
            <div className='mx-auto max-w-[1100px] space-y-3 px-2'>
              {currentFeed.isLoading && (
                <ProgressBar message='Loading…' viewMode='full' className='bg-transparent' />
              )}
              {currentFeed.isError && (
                <ErrorWindow message='Failed to load newsfeed' viewMode='full' className='bg-transparent' />
              )}
              <div className='text-center mt-16 mb-4'>
                <h1 className='text-xl text-secondary font-semibold'>Newsletter</h1>
              </div>
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