import { type Newsfeed } from '../types/newsfeed'
import { apiFetch } from '@/api'
import camelcaseKeys from 'camelcase-keys'

/**
 * List all newsfeeds under a subscription.
 */
export async function listNewsfeeds(subscriptionId: string): Promise<Newsfeed[]> {
  const res = await apiFetch<{ data: Record<string, unknown> }>({
    path: `/subscriptions/${subscriptionId}/newsfeeds`,
    method: 'GET'
  })
  const data = camelcaseKeys(res.data, { deep: true })
  return data.newsfeeds as Newsfeed[]
}
