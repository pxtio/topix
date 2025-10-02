import { type Newsfeed } from '../types/newsfeed'
import { apiFetch } from '@/api'
import camelcaseKeys from 'camelcase-keys'
import { newsfeedsKey } from './query-keys'
import { useMutation, useQueryClient } from '@tanstack/react-query'


/**
 * Create a new newsfeed under a subscription.
 */
export async function createNewsfeed(subscriptionId: string): Promise<Newsfeed> {
  const res = await apiFetch<{ data: Record<string, unknown> }>({
    path: `/subscriptions/${subscriptionId}/newsfeeds`,
    method: 'POST'
  })
  const data = camelcaseKeys(res.data, { deep: true })
  return data.newsfeed as Newsfeed
}


/**
 * React query mutation hook to create a new newsfeed under a subscription.
 */
export function useCreateNewsfeed(subscriptionId: string | undefined) {
  const qc = useQueryClient()

  return useMutation<Newsfeed, unknown, void, { prev?: Newsfeed[] | undefined, optimistic?: Newsfeed }>({
    mutationFn: () => createNewsfeed(subscriptionId as string),
    onMutate: async () => {
      if (!subscriptionId) return {}
      await qc.cancelQueries({ queryKey: newsfeedsKey(subscriptionId) })
      const prev = qc.getQueryData<Newsfeed[]>(newsfeedsKey(subscriptionId))

      const optimistic: Newsfeed = {
        id: `optimistic-${Date.now()}`,
        type: 'newsfeed',
        subscriptionId: subscriptionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      qc.setQueryData<Newsfeed[]>(newsfeedsKey(subscriptionId), old => [optimistic, ...(old ?? [])])
      return { prev, optimistic }
    },
    onError: (_err, _vars, ctx) => {
      if (!subscriptionId) return
      if (ctx?.prev) qc.setQueryData(newsfeedsKey(subscriptionId), ctx.prev)
    },
    onSuccess: nf => {
      if (!subscriptionId) return
      qc.setQueryData<Newsfeed[]>(newsfeedsKey(subscriptionId), old => {
        if (!old) return [nf]
        const idx = old.findIndex(i => i.id.startsWith('optimistic-'))
        if (idx >= 0) {
          const copy = old.slice()
          copy[idx] = nf
          return copy
        }
        return [nf, ...old]
      })
    },
    onSettled: () => {
      if (!subscriptionId) return
      qc.invalidateQueries({ queryKey: newsfeedsKey(subscriptionId) })
    }
  })
}