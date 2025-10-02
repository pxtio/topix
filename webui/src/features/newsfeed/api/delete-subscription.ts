import { apiFetch } from '@/api'
import camelcaseKeys from 'camelcase-keys'
import snakecaseKeys from 'snakecase-keys'


/**
 * Delete a subscription. If `hardDelete` is true, all associated newsfeeds will also be deleted.
 */
export async function deleteSubscription(args: {
  subscriptionId: string
  hardDelete?: boolean
}): Promise<boolean> {
  const { subscriptionId, ...q } = args
  const params = snakecaseKeys(q)
  const res = await apiFetch<{ data: Record<string, unknown> }>({
    path: `/subscriptions/${subscriptionId}`,
    method: 'DELETE',
    params
  })
  const data = camelcaseKeys(res.data, { deep: true })
  return data.deleted as boolean
}
