import { useEffect, useMemo, useState } from 'react'
import { useListSubscriptions } from '../api/list-subscriptions'
import { SubscriptionCard } from '../components/subscription-card'
import { CreateSubscriptionDialog } from '../components/create-subscription-dialog'
import { CreateSubscriptionCardTrigger } from '../components/create-subscription-card-trigger'
import { useNavigate } from '@tanstack/react-router'
import { useDeleteSubscription } from '../api/delete-subscription'
import type { Subscription } from '../types/subscription'
import { ThemedWelcome } from '@/features/agent/components/chat/welcome-message'
import clsx from 'clsx'

type Mode = 'full' | 'preview'

function useOneRowCount() {
  const [count, setCount] = useState(1)

  useEffect(() => {
    const sm = window.matchMedia('(min-width: 640px)')
    const lg = window.matchMedia('(min-width: 1024px)')

    const compute = () => setCount(lg.matches ? 3 : sm.matches ? 2 : 1)
    compute()

    const onSm = () => compute()
    const onLg = () => compute()
    sm.addEventListener('change', onSm)
    lg.addEventListener('change', onLg)
    return () => {
      sm.removeEventListener('change', onSm)
      lg.removeEventListener('change', onLg)
    }
  }, [])

  return count
}

/**
 * SubscriptionsPage shows all subscriptions in a grid with a create button.
 * In preview mode, it shows only a single responsive row and a "View all" button.
 */
export default function SubscriptionsPage({
  className,
  mode = 'full'
}: {
  className?: string
  mode?: Mode
}) {
  const pageClassName = clsx('w-full h-full', className)
  const subs = useListSubscriptions()
  const navigate = useNavigate()
  const maxPerRow = useOneRowCount()

  const sorted = useMemo(
    () =>
      (subs.data ?? [])
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [subs.data]
  )

  const visible = useMemo(() => {
    if (mode === 'full') return sorted
    const slotsForSubs = Math.max(0, maxPerRow - 1)
    return sorted.slice(0, slotsForSubs)
  }, [mode, sorted, maxPerRow])

  return (
    <div className={pageClassName}>
      <div className='pt-8 pb-4 flex flex-row items-center justify-center gap-4 px-4 sm:px-6 lg:px-8'>
        <ThemedWelcome name={'Shark'} message={'Feeds - Your Topics'} className='w-auto' />
        {mode === 'preview' && (
          <button
            onClick={() => navigate({ to: '/subscriptions' })}
            className='rounded-full px-2 py-1 text-xs font-medium bg-accent text-accent-foreground/50 hover:text-accent-foreground shadow hover:bg-muted shadow-sm transition'
          >
            View all
          </button>
        )}
      </div>

      <div className='mx-auto max-w-5xl p-4'>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 place-items-center'>
          <CreateSubscriptionDialog
            trigger={
              <CreateSubscriptionCardTrigger>
                <span className='sr-only'>Create</span>
              </CreateSubscriptionCardTrigger>
            }
          />

          {visible.map(sub => (
            <SubscriptionButton key={sub.id} sub={sub} />
          ))}
        </div>

        {subs.isLoading && (
          <div className='text-center mt-6 text-muted-foreground text-sm'>Loading…</div>
        )}
        {subs.isError && (
          <div className='text-center mt-6 text-destructive text-sm'>Failed to load subscriptions</div>
        )}
      </div>
    </div>
  )
}

/**
 * A button that shows the latest newsfeed of a subscription, or is disabled if none exist.
 */
function SubscriptionButton({ sub }: { sub: Subscription }) {
  const navigate = useNavigate()
  const del = useDeleteSubscription()

  return (
    <SubscriptionCard
      sub={sub}
      onClick={() => {
        navigate({ to: '/subscriptions/$id', params: { id: sub.id } })
      }}
      onDelete={() => del.mutate({ subscriptionId: sub.id })}
    />
  )
}