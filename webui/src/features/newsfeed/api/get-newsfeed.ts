import { type Newsfeed } from '../types/newsfeed'
import { apiFetch } from '@/api'
import { useQuery } from '@tanstack/react-query'
import camelcaseKeys from 'camelcase-keys'
import { newsfeedKey } from './query-keys'

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


/**
 * React query hook to get a specific newsfeed under a subscription.
 */
export function useGetNewsfeed(subscriptionId: string | undefined, newsfeedId: string | undefined) {
  return useQuery<Newsfeed>({
    queryKey: newsfeedKey(subscriptionId ?? '', newsfeedId ?? ''),
    queryFn: () => getNewsfeed({ subscriptionId: subscriptionId as string, newsfeedId: newsfeedId as string }),
    enabled: !!subscriptionId && !!newsfeedId
  })
}