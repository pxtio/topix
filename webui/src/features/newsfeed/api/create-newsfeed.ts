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

type Ctx = {
  prev?: Newsfeed[]
  subId?: string
}

export function useCreateNewsfeed(subscriptionId: string | undefined) {
  const qc = useQueryClient()

  return useMutation<Newsfeed, unknown, Vars, Ctx>({
    mutationFn: ({ uid, subscriptionIdOverride }) =>
      createNewsfeed((subscriptionIdOverride ?? subscriptionId) as string, uid),

    onMutate: async ({ uid, subscriptionIdOverride }) => {
      const subId = subscriptionIdOverride ?? subscriptionId
      if (!subId) return {}

      const key = newsfeedsKey(subId)
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<Newsfeed[]>(key)

      const now = new Date().toISOString()
      const optimistic: Newsfeed = {
        id: uid,
        type: 'newsfeed',
        subscriptionId: subId,
        createdAt: now,
        updatedAt: now
        // list endpoint excludes content; UI will show "Generating…" by pendingId
      } as Newsfeed

      qc.setQueryData<Newsfeed[]>(key, old => [optimistic, ...(old ?? [])])

      return { prev, subId }
    },

    onError: (_err, _vars, ctx) => {
      if (!ctx?.subId) return
      const key = newsfeedsKey(ctx.subId)
      if (ctx.prev) qc.setQueryData(key, ctx.prev)
      else qc.invalidateQueries({ queryKey: key })
    },

    onSettled: (_data, _err, vars) => {
      const subId = vars.subscriptionIdOverride ?? subscriptionId
      if (!subId) return
      qc.invalidateQueries({ queryKey: newsfeedsKey(subId) })
    }
  })
}