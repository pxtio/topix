import { type Subscription } from '../types/subscription'
import { apiFetch } from '@/api'
import { useQuery } from '@tanstack/react-query'
import camelcaseKeys from 'camelcase-keys'
import { subscriptionsKey } from './query-keys'

/**
 * List all subscriptions.
 */
export async function listSubscriptions(): Promise<Subscription[]> {
  const res = await apiFetch<{ data: Record<string, unknown> }>({
    path: '/subscriptions',
    method: 'GET'
  })
  const data = camelcaseKeys(res.data, { deep: true })
  return data.subscriptions as Subscription[]
}

/**
 * React query hook to list all subscriptions.
 */
export function useListSubscriptions() {
  return useQuery<Subscription[]>({
    queryKey: subscriptionsKey,
    queryFn: () => listSubscriptions()
  })
}