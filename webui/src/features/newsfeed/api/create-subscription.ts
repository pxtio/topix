import camelcaseKeys from 'camelcase-keys'
import { type Subscription } from '../types/subscription'
import { apiFetch } from '@/api'
import snakecaseKeys from 'snakecase-keys'


/**
 * Create a new subscription.
 */
export async function createSubscription(input: {
  topic: string
  rawDescription?: string
}): Promise<Subscription> {
  const body = snakecaseKeys(input, { deep: true })
  const res = await apiFetch<{ data: Record<string, unknown> }>({
    path: '/subscriptions',
    method: 'PUT',
    body
  })
  const data = camelcaseKeys(res.data, { deep: true })
  return data.subscription as Subscription
}
