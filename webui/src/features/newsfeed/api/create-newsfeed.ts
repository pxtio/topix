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

type Vars = { uid: string }

/**
 * React query mutation hook to create a new newsfeed under a subscription.
 */
export function useCreateNewsfeed(subscriptionId: string | undefined) {
  const qc = useQueryClient()

  return useMutation<Newsfeed, unknown, Vars, { prev?: Newsfeed[] | undefined }>({
    mutationFn: ({ uid }) => createNewsfeed(subscriptionId as string, uid),
    onMutate: async ({ uid }) => {
      if (!subscriptionId) return {}
      await qc.cancelQueries({ queryKey: newsfeedsKey(subscriptionId) })
      const prev = qc.getQueryData<Newsfeed[]>(newsfeedsKey(subscriptionId))

      const optimistic: Newsfeed = {
        id: uid,                      // use caller-provided uid
        type: 'newsfeed',
        subscriptionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      qc.setQueryData<Newsfeed[]>(newsfeedsKey(subscriptionId), old => [optimistic, ...(old ?? [])])
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (!subscriptionId) return
      if (ctx?.prev) qc.setQueryData(newsfeedsKey(subscriptionId), ctx.prev)
    },
    onSuccess: nf => {
      if (!subscriptionId) return
      // replace the optimistic row with same id
      qc.setQueryData<Newsfeed[]>(newsfeedsKey(subscriptionId), old => {
        if (!old) return [nf]
        const idx = old.findIndex(i => i.id === nf.id)
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