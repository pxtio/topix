// src/features/newsfeed/pages/newsfeeds-screen.tsx
import { useMemo } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { useListNewsfeeds } from '@/features/newsfeed/api/list-newsfeeds'
import { cn } from '@/lib/utils'

export function NewsfeedsScreen() {
  const { id } = useParams({ from: '/subscriptions/$id', shouldThrow: false })
  const subId = id as string | undefined

  const navigate = useNavigate()
  const feedsQuery = useListNewsfeeds(subId)

  const sorted = useMemo(() => {
    const feeds = feedsQuery.data ?? []
    return feeds.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [feedsQuery.data])

  const openNewsletter = (newsfeedId: string) => {
    if (!subId) return
    navigate({
      to: '/subscriptions/$id/newsfeeds/$newsfeedId',
      params: { id: subId, newsfeedId }
    })
  }

  return (
    <div className='w-full h-full p-6 space-y-6'>
      <div className='text-center'>
        <h1 className='text-xl text-secondary font-semibold'>Newsletters</h1>
      </div>

      {feedsQuery.isLoading && (
        <div className='text-center text-sm text-muted-foreground'>Loading…</div>
      )}
      {feedsQuery.isError && (
        <div className='text-center text-sm text-destructive'>Failed to load newsletters</div>
      )}

      <div className='mx-auto max-w-4xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
        {sorted.map(feed => (
          <NewsletterCard
            key={feed.id}
            createdAt={feed.createdAt}
            onClick={() => openNewsletter(feed.id)}
          />
        ))}
      </div>

      {!feedsQuery.isLoading && sorted.length === 0 && (
        <div className='text-center text-sm text-muted-foreground'>No newsletters yet</div>
      )}
    </div>
  )
}

function NewsletterCard({
  createdAt,
  onClick
}: {
  createdAt: string
  onClick: () => void
}) {
  const title = `Newsletter ${formatNewsletterDate(createdAt)}`
  const subtitle = new Date(createdAt).toLocaleString()

  return (
    <button
      type='button'
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
      className='text-left'
      aria-label={title}
    >
      <Card className={cn('rounded-xl h-24 transition hover:shadow-sm hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary')}>
        <CardContent className='h-full flex items-center text-center justify-center px-4'>
          <div className='space-y-1'>
            <div className='font-medium'>{title}</div>
            <div className='text-xs text-muted-foreground'>{subtitle}</div>
          </div>
        </CardContent>
      </Card>
    </button>
  )
}

function formatNewsletterDate(iso: string) {
  const d = new Date(iso)
  const month = MONTHS_SHORT[d.getMonth()]
  const day = d.getDate()
  const year = d.getFullYear()
  return `${month} ${ordinal(day)}, ${year}`
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec']

function ordinal(n: number) {
  const s = ['th','st','nd','rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}