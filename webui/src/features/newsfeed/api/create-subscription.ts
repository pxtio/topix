import camelcaseKeys from 'camelcase-keys'
import { type Subscription } from '../types/subscription'
import { apiFetch } from '@/api'
import snakecaseKeys from 'snakecase-keys'
import { subscriptionsKey } from './query-keys'
import { useMutation, useQueryClient } from '@tanstack/react-query'


/**
 * Create a new subscription.
 */
export async function createSubscription(input: {
  topic: string
  rawDescription?: string
  uid: string
}): Promise<Subscription> {
  const body = snakecaseKeys(input, { deep: true })
  const res = await apiFetch<{ data: Record<string, unknown> }>({
    path: '/subscriptions',
    method: 'PUT',
    params: { uid: input.uid },
    body
  })
  const data = camelcaseKeys(res.data, { deep: true })
  return data.subscription as Subscription
}


type Vars = { topic: string, rawDescription?: string, uid: string }

/**
 * React query mutation hook to create a new subscription.
 */
export function useCreateSubscription() {
  const qc = useQueryClient()

  return useMutation<Subscription, unknown, Vars, { prev?: Subscription[] | undefined }>({
    mutationFn: vars => createSubscription(vars),
    onMutate: async vars => {
      await qc.cancelQueries({ queryKey: subscriptionsKey })
      const prev = qc.getQueryData<Subscription[]>(subscriptionsKey)

      const optimistic: Subscription = {
        id: vars.uid,                // use caller-provided uid
        type: 'subscription',
        label: { markdown: vars.topic },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        properties: {
          rawDescription: vars.rawDescription ? { id: 'tmp', type: 'text', text: vars.rawDescription } : undefined
        }
      }

      qc.setQueryData<Subscription[]>(subscriptionsKey, old => [optimistic, ...(old ?? [])])
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(subscriptionsKey, ctx.prev)
    },
    onSuccess: sub => {
      // replace the optimistic row with matching uid
      qc.setQueryData<Subscription[]>(subscriptionsKey, old => {
        if (!old) return [sub]
        const idx = old.findIndex(s => s.id === sub.id)
        if (idx >= 0) {
          const copy = old.slice()
          copy[idx] = sub
          return copy
        }
        return [sub, ...old]
      })
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: subscriptionsKey })
    }
  })
}