import { type Newsfeed } from '../types/newsfeed'
import { apiFetch } from '@/api'
import camelcaseKeys from 'camelcase-keys'
import { newsfeedsKey } from './query-keys'
import { useMutation, useQueryClient } from '@tanstack/react-query'


/**
 * Create a new newsfeed under a subscription.
 */
export async function createNewsfeed(subscriptionId: string, uid: string): Promise<Newsfeed> {
  const res = await apiFetch<{ data: Record<string, unknown> }>({
    path: `/subscriptions/${subscriptionId}/newsfeeds`,
    method: 'POST',
    params: { uid }
  })
  const data = camelcaseKeys(res.data, { deep: true })
  return data.newsfeed as Newsfeed
}

type Vars = {
  uid: string
  // lets you create a feed for a subscription whose id you just created (predefined uid)
  subscriptionIdOverride?: string
}

export function useCreateNewsfeed(subscriptionId: string | undefined) {
  const qc = useQueryClient()

  return useMutation<Newsfeed, unknown, Vars, { prev?: Newsfeed[] | undefined }>({
    mutationFn: ({ uid, subscriptionIdOverride }) =>
      createNewsfeed((subscriptionIdOverride ?? subscriptionId) as string, uid),

    onMutate: async ({ uid, subscriptionIdOverride }) => {
      const subId = subscriptionIdOverride ?? subscriptionId
      if (!subId) return {}

      await qc.cancelQueries({ queryKey: newsfeedsKey(subId) })
      const prev = qc.getQueryData<Newsfeed[]>(newsfeedsKey(subId))

      const optimistic: Newsfeed = {
        id: uid,
        type: 'newsfeed',
        subscriptionId: subId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      qc.setQueryData<Newsfeed[]>(newsfeedsKey(subId), old => [optimistic, ...(old ?? [])])
      return { prev }
    },

    onError: (_err, _vars, ctx) => {
      // best-effort rollback when we know the list snapshot
      if (ctx?.prev) {
        // caller will trigger an invalidate on settle, so no manual restore needed here
      }
    },

    onSettled: (_data, _err, vars) => {
      const subId = vars.subscriptionIdOverride ?? subscriptionId
      if (!subId) return
      qc.invalidateQueries({ queryKey: newsfeedsKey(subId) })
    }
  })
}