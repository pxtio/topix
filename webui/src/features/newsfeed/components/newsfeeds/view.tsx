import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { useListNewsfeeds } from '@/features/newsfeed/api/list-newsfeeds'
import { useGetNewsfeed } from '@/features/newsfeed/api/get-newsfeed'
import { MarkdownView } from '@/components/markdown/markdown-view'
import { ErrorWindow, LoadingWindow } from '@/components/loading-view'
import type { ViewMode } from '../../types/newsfeeds-view'
import { TopViewPanel } from './top-panel'
import { NewsletterCard } from './card'
import { NewsfeedGrid } from './grid'
import type { UrlAnnotation } from '@/features/agent/types/tool-outputs'
import { CreateNewsfeedTile } from './create-new'
import type { Newsfeed } from '../../types/newsfeed'
import { useNewsfeedsStore } from '../../store/newsfeeds'
import { SubscriptionInfoPanel } from './info'
import { formatNewsletterDate } from '../../utils/date'
import { CopyAnswer } from '@/features/agent/components/chat/actions/copy-answer'
import { SaveAsNote } from '@/features/agent/components/chat/actions/save-as-note'

const EMPTY_LIST = [] as Newsfeed[]

export function NewsfeedsView() {
  const { id } = useParams({ from: '/subscriptions/$id', shouldThrow: false })
  const subId = id as string | undefined

  const feedsQuery = useListNewsfeeds(subId)

  // subscribe directly to the slice for this subscription (stable empty fallback)
  const selector = useCallback(
    (s: ReturnType<typeof useNewsfeedsStore.getState>) =>
      subId ? s.pending[subId] ?? EMPTY_LIST : EMPTY_LIST,
    [subId]
  )
  const pendingList = useNewsfeedsStore(selector)

  // build a Set for quick membership checks
  const pendingIdSet = useMemo(
    () => new Set(pendingList.map(p => p.id)),
    [pendingList]
  )

  // fuse pending placeholders with server list, dedupe by id, newest first
  const fused = useMemo<Newsfeed[]>(() => {
    const server = feedsQuery.data ?? []
    if (!subId) return server
    const serverIds = new Set(server.map(n => n.id))
    const synthetic: Newsfeed[] = pendingList
      .filter(p => !serverIds.has(p.id))
      .map(p => ({
        id: p.id,
        type: 'newsfeed',
        subscriptionId: subId,
        createdAt: p.createdAt,
        updatedAt: p.createdAt
      } as Newsfeed))
    return [...synthetic, ...server].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [feedsQuery.data, pendingList, subId])

  // pick the first READY item (skip pendings)
  const latestReadyId = useMemo(
    () => fused.find(n => !pendingIdSet.has(n.id))?.id,
    [fused, pendingIdSet]
  )

  // view + selection
  const [viewMode, setViewMode] = useState<ViewMode>('history')
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)

  // default-once guard
  const didSetDefault = useRef(false)
  useEffect(() => {
    if (didSetDefault.current) return
    if (!feedsQuery.isLoading) {
      setViewMode(latestReadyId ? 'article' : 'history')
      setSelectedId(undefined)
      didSetDefault.current = true
    }
  }, [feedsQuery.isLoading, latestReadyId])

  // current content for article/grid (prefer selected, fall back to first ready)
  const currentId = viewMode !== 'history' ? (selectedId ?? latestReadyId) : undefined
  const currentFeed = useGetNewsfeed(subId, currentId)
  const markdown = currentFeed.data?.content?.markdown ?? ''
  const currentFeedTitle = currentFeed.data ? `Newsletter ${formatNewsletterDate(currentFeed.data.createdAt)}` : ''

  const annotations: UrlAnnotation[] = useMemo(() => {
    return (currentFeed.data?.properties?.newsGrid?.sources || []) as UrlAnnotation[]
  }, [currentFeed.data?.properties])

  const openFromGrid = (id: string) => {
    setSelectedId(id)
    setViewMode('article')
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
        hasLatest={!!latestReadyId}
      />

      <div className='w-full h-full p-6 space-y-4 relative'>
        <div className='w-full absolute inset-0 overflow-x-hidden overflow-y-auto scrollbar-thin pt-20 pb-16'>
          {feedsQuery.isLoading && (
            <LoadingWindow message='Loading newsletters…' viewMode='full' className='bg-transparent' />
          )}
          {feedsQuery.isError && (
            <ErrorWindow message='Failed to load newsletters' viewMode='full' className='bg-transparent' />
          )}
          {
            markdown && viewMode !== 'history' && viewMode !== 'info' && (
              <div className='text-center flex flex-row items-center justify-center gap-4'>
                <CopyAnswer answer={markdown} />
                <SaveAsNote message={markdown} type="notify" saveAsIs={true} />
                <SaveAsNote message={markdown} type="mapify" />
              </div>
            )
          }

          {/* ARTICLE */}
          {viewMode === 'article' && currentId && (
            <div className='mx-auto max-w-[900px] space-y-3'>
              {currentFeed.isLoading && (
                <LoadingWindow message='Loading…' viewMode='full' className='bg-transparent' />
              )}
              {currentFeed.isError && (
                <ErrorWindow message='Failed to load newsfeed' viewMode='full' className='bg-transparent' />
              )}
              {markdown && (
                <div className='prose max-w-[800px] mx-auto p-4'>
                  <div className='text-center mt-12'>
                    <h1 className='text-xl text-secondary font-semibold'>{currentFeedTitle}</h1>
                  </div>
                  <MarkdownView content={markdown} />
                </div>
              )}
            </div>
          )}

          {/* HISTORY */}
          {viewMode === 'history' && (
            <div className='mx-auto max-w-4xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto scrollbar-thin pt-16 pb-16'>
              <CreateNewsfeedTile
                subscriptionId={subId}
                onStart={() => {
                  setViewMode('history') // stay here; hook handles pending add/remove
                }}
              />
              {fused.map(feed => (
                <NewsletterCard
                  key={feed.id}
                  id={feed.id}
                  subscriptionId={subId!}
                  createdAt={feed.createdAt}
                  active={feed.id === selectedId}
                  generating={pendingIdSet.has(feed.id)}
                  onClick={() => openFromGrid(feed.id)}
                />
              ))}
            </div>
          )}

          {/* GRID */}
          {(viewMode === 'grid' || viewMode === "linear") && currentId && (
            <div className='mx-auto max-w-[1100px] space-y-3 px-2'>
              {currentFeed.isLoading && (
                <LoadingWindow message='Loading…' viewMode='full' className='bg-transparent' />
              )}
              {currentFeed.isError && (
                <ErrorWindow message='Failed to load newsfeed' viewMode='full' className='bg-transparent' />
              )}
              <div className='text-center mt-16 mb-4'>
                <h1 className='text-xl text-secondary font-semibold'>{currentFeedTitle}</h1>
              </div>
              {annotations.length > 0 ? (
                <NewsfeedGrid annotations={annotations} viewMode={viewMode} />
              ) : (
                <div className='text-center text-sm text-muted-foreground py-8'>
                  No links in this newsfeed
                </div>
              )}
            </div>
          )}

          {/* INFO */}
          {
            viewMode === "info" && subId && (
              <SubscriptionInfoPanel subscriptionId={subId} />
            )
          }

          {!feedsQuery.isLoading && fused.length === 0 && (
            <div className='text-center text-sm text-muted-foreground'>No newsletters yet</div>
          )}
        </div>
      </div>
    </div>
  )
}