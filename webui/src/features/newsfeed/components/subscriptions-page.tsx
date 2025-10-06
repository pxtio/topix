import { useMemo } from 'react'
import { useListSubscriptions } from '../api/list-subscriptions'
import { useListNewsfeeds } from '../api/list-newsfeeds'
import { SubscriptionCard } from '../components/subscription-card'
import { CreateSubscriptionDialog } from '../components/create-subscription-dialog'
import { CreateSubscriptionCardTrigger } from '../components/create-subscription-card-trigger'
import { useNavigate } from '@tanstack/react-router'
import { useDeleteSubscription } from '../api/delete-subscription'


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
            <SubscriptionButton key={sub.id} subId={sub.id} label={sub.label} />
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
  subId,
  label
}: {
  subId: string
  label: { markdown: string }
}) {
  const feeds = useListNewsfeeds(subId)
  const latestId = feeds.data?.[0]?.id
  const navigate = useNavigate()
  const del = useDeleteSubscription()

  return (
    <SubscriptionCard
      sub={{
        id: subId,
        type: 'subscription',
        label: { markdown: label.markdown },
        createdAt: '',
        updatedAt: ''
      }}
      disabled={!latestId}
      onClick={() => {
        if (!latestId) return
        navigate({ to: '/subscriptions/$id', params: { id: subId } })
      }}
      onDelete={() => del.mutate({ subscriptionId: subId })}
    />
  )
}