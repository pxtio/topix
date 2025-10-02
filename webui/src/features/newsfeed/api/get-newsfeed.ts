import { type Newsfeed } from '../types/newsfeed'
import { apiFetch } from '@/api'
import camelcaseKeys from 'camelcase-keys'

/**
 * Get a specific newsfeed under a subscription.
 */
export async function getNewsfeed(args: {
  subscriptionId: string
  newsfeedId: string
}): Promise<Newsfeed> {
  const { subscriptionId, newsfeedId } = args
  const res = await apiFetch<{ data: Record<string, unknown> }>({
    path: `/subscriptions/${subscriptionId}/newsfeeds/${newsfeedId}`,
    method: 'GET'
  })
  const data = camelcaseKeys(res.data, { deep: true })
  return data.newsfeed as Newsfeed
}
