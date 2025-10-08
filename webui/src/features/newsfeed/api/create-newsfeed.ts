import { type Newsfeed } from '../types/newsfeed'
import { apiFetch } from '@/api'
import camelcaseKeys from 'camelcase-keys'
import { newsfeedsKey } from './query-keys'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNewsfeedsStore } from '@/features/newsfeed/store/newsfeeds'


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
  subscriptionIdOverride?: string
}

type Ctx = {
  prev?: Newsfeed[]
  subId?: string
  uid?: string
}

export function useCreateNewsfeed(subscriptionId: string | undefined) {
  const qc = useQueryClient()
  const addPending = useNewsfeedsStore(s => s.addPending)
  const removePending = useNewsfeedsStore(s => s.removePending)

  return useMutation<Newsfeed, unknown, Vars, Ctx>({
    mutationFn: ({ uid, subscriptionIdOverride }) =>
      createNewsfeed((subscriptionIdOverride ?? subscriptionId) as string, uid),

    onMutate: async ({ uid, subscriptionIdOverride }) => {
      const subId = subscriptionIdOverride ?? subscriptionId
      if (!subId) return {}

      // 1) mark pending in zustand
      addPending(subId, uid)

      // 2) optimistic insert in list cache
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
      } as Newsfeed

      qc.setQueryData<Newsfeed[]>(key, old => [optimistic, ...(old ?? [])])

      return { prev, subId, uid }
    },

    onSuccess: (_data, _vars, ctx) => {
      const subId = ctx?.subId
      if (!subId || !ctx?.uid) return
      // remove pending immediately on success
      removePending(subId, ctx.uid)
      qc.invalidateQueries({ queryKey: newsfeedsKey(subId) })
    },

    onError: (_err, _vars, ctx) => {
      if (!ctx?.subId) return
      const key = newsfeedsKey(ctx.subId)
      if (ctx.prev) qc.setQueryData(key, ctx.prev)
      // also clear pending on error
      if (ctx.uid) removePending(ctx.subId, ctx.uid)
    },

    onSettled: (_data, _err, vars) => {
      const subId = vars.subscriptionIdOverride ?? subscriptionId
      if (!subId) return
      qc.invalidateQueries({ queryKey: newsfeedsKey(subId) })
    }
  })
}