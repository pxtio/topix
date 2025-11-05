import { useMemo } from 'react'
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

/**
 * SubscriptionsPage shows all subscriptions in a grid with a create button.
 * In preview mode, it shows only the create card and a "View All Topics" action beside it.
 */
export default function SubscriptionsPage({
  className,
  mode = 'full',
  hideTitle = false,
}: {
  className?: string
  mode?: Mode
  hideTitle?: boolean
}) {
  const pageClassName = clsx('w-full h-full', className)
  const subs = useListSubscriptions()
  const navigate = useNavigate()

  const sorted = useMemo(
    () =>
      (subs.data ?? [])
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [subs.data]
  )

  return (
    <div className={pageClassName}>
      {!hideTitle && (
        <div className='pt-8 pb-4 flex flex-row items-center justify-center gap-4 px-4 sm:px-6 lg:px-8'>
          <ThemedWelcome name={'Shark'} message={'Topics'} className='w-auto' />
        </div>
      )}

      <div className='mx-auto max-w-5xl p-4'>
        {mode === 'preview' ? (
          <div className='flex items-center gap-4'>
            <CreateSubscriptionDialog
              trigger={
                <CreateSubscriptionCardTrigger>
                  <span className='sr-only'>Create</span>
                </CreateSubscriptionCardTrigger>
              }
            />
            <button
              onClick={() => navigate({ to: '/subscriptions' })}
              className='text-sm font-medium text-muted-foreground hover:text-foreground underline underline-offset-4 decoration-muted-foreground/40 hover:decoration-foreground'
            >
              View All Topics
            </button>
          </div>
        ) : (
          <>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 place-items-center'>
              <CreateSubscriptionDialog
                trigger={
                  <CreateSubscriptionCardTrigger>
                    <span className='sr-only'>Create</span>
                  </CreateSubscriptionCardTrigger>
                }
              />
              {sorted.map(sub => (
                <SubscriptionButton key={sub.id} sub={sub} />
              ))}
            </div>

            {subs.isLoading && (
              <div className='text-center mt-6 text-muted-foreground text-sm'>Loading…</div>
            )}
            {subs.isError && (
              <div className='text-center mt-6 text-destructive text-sm'>
                Failed to load subscriptions
              </div>
            )}
          </>
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