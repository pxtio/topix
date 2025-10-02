import { apiFetch } from '@/api'
import camelcaseKeys from 'camelcase-keys'


/**
 * Delete a specific newsfeed under a subscription.
 */
export async function deleteNewsfeed(args: {
  subscriptionId: string
  newsfeedId: string
}): Promise<boolean> {
  const { subscriptionId, newsfeedId } = args
  const res = await apiFetch<{ data: Record<string, unknown> }>({
    path: `/subscriptions/${subscriptionId}/newsfeeds/${newsfeedId}`,
    method: 'DELETE'
  })
  const data = camelcaseKeys(res.data, { deep: true })
  return data.deleted as boolean
}
