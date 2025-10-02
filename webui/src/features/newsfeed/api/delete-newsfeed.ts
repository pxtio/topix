import { apiFetch } from '@/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import camelcaseKeys from 'camelcase-keys'
import type { Newsfeed } from '../types/newsfeed'
import { newsfeedKey, newsfeedsKey } from './query-keys'


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


/**
 * React query mutation hook to delete a newsfeed.
 */
export function useDeleteNewsfeed(subscriptionId: string | undefined) {
  const qc = useQueryClient()

  return useMutation<boolean, unknown, { newsfeedId: string }, { prev?: Newsfeed[] | undefined }>({
    mutationFn: ({ newsfeedId }) =>
      deleteNewsfeed({ subscriptionId: subscriptionId as string, newsfeedId }),
    onMutate: async ({ newsfeedId }) => {
      if (!subscriptionId) return {}
      await qc.cancelQueries({ queryKey: newsfeedsKey(subscriptionId) })
      const prev = qc.getQueryData<Newsfeed[]>(newsfeedsKey(subscriptionId))
      qc.setQueryData<Newsfeed[]>(newsfeedsKey(subscriptionId), old => old?.filter(n => n.id !== newsfeedId) ?? [])
      qc.removeQueries({ queryKey: newsfeedKey(subscriptionId, newsfeedId), exact: true })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (!subscriptionId) return
      if (ctx?.prev) qc.setQueryData(newsfeedsKey(subscriptionId), ctx.prev)
    },
    onSettled: () => {
      if (!subscriptionId) return
      qc.invalidateQueries({ queryKey: newsfeedsKey(subscriptionId) })
    }
  })
}