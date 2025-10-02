import { type Subscription } from '../types/subscription'
import { apiFetch } from '@/api'
import camelcaseKeys from 'camelcase-keys'

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
