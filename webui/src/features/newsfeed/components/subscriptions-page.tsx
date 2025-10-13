import { useMemo } from 'react'
import { useListSubscriptions } from '../api/list-subscriptions'
import { SubscriptionCard } from '../components/subscription-card'
import { CreateSubscriptionDialog } from '../components/create-subscription-dialog'
import { CreateSubscriptionCardTrigger } from '../components/create-subscription-card-trigger'
import { useNavigate } from '@tanstack/react-router'
import { useDeleteSubscription } from '../api/delete-subscription'
import type { Subscription } from '../types/subscription'


/**
 * SubscriptionsPage shows all subscriptions in a grid with a create button.
 */
export default function SubscriptionsPage() {
  const subs = useListSubscriptions()

  const sorted = useMemo(
    () => (subs.data ?? []).slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [subs.data]
  )

  return (
    <div className='w-full h-full'>
      <div className='pt-8 pb-4'>
        <h1 className='text-center text-xl text-secondary font-semibold'>Your Subscriptions</h1>
      </div>

      <div className='mx-auto max-w-5xl p-4'>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 place-items-center'>
          {/* plus card as dialog trigger */}
          <CreateSubscriptionDialog
            trigger={<CreateSubscriptionCardTrigger><span className='sr-only'>Create</span></CreateSubscriptionCardTrigger>}
          />

          {sorted.map(sub => (
            <SubscriptionButton key={sub.id} sub={sub} />
          ))}
        </div>

        {subs.isLoading && <div className='text-center mt-6 text-muted-foreground text-sm'>Loading…</div>}
        {subs.isError && <div className='text-center mt-6 text-destructive text-sm'>Failed to load subscriptions</div>}
      </div>
    </div>
  )
}


/**
 * A button that shows the latest newsfeed of a subscription, or is disabled if none exist.
 */
function SubscriptionButton({
  sub
}: {
  sub: Subscription
}) {
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