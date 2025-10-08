import { apiFetch } from '@/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import camelcaseKeys from 'camelcase-keys'
import snakecaseKeys from 'snakecase-keys'
import type { Subscription } from '../types/subscription'
import { subscriptionKey, subscriptionsKey } from './query-keys'


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


/**
 * React query mutation hook to delete a subscription.
 */
export function useDeleteSubscription() {
  const qc = useQueryClient()

  return useMutation<boolean, unknown, { subscriptionId: string, hardDelete?: boolean }, { prev?: Subscription[] | undefined }>({
    mutationFn: args => deleteSubscription(args),
    onMutate: async ({ subscriptionId }) => {
      await qc.cancelQueries({ queryKey: subscriptionsKey })
      const prev = qc.getQueryData<Subscription[]>(subscriptionsKey)
      qc.setQueryData<Subscription[]>(subscriptionsKey, old => old?.filter(s => s.id !== subscriptionId) ?? [])
      // also clear the item cache for good UX
      qc.removeQueries({ queryKey: subscriptionKey(subscriptionId), exact: true })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(subscriptionsKey, ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: subscriptionsKey })
    }
  })
}