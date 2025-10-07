import { type Newsfeed } from '../types/newsfeed'
import { apiFetch } from '@/api'
import camelcaseKeys from 'camelcase-keys'
import { newsfeedsKey } from './query-keys'
import { useQuery } from '@tanstack/react-query'

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


/**
 * React query hook to list all newsfeeds under a subscription.
 */
export function useListNewsfeeds(subscriptionId: string | undefined) {
  return useQuery<Newsfeed[]>({
    queryKey: newsfeedsKey(subscriptionId ?? ''),
    queryFn: () => listNewsfeeds(subscriptionId as string),
    enabled: !!subscriptionId
  })
}