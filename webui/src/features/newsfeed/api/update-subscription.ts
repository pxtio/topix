import { apiFetch } from "@/api";
import type { Subscription } from "../types/subscription";
import snakecaseKeys from "snakecase-keys";
import { subscriptionKey, subscriptionsKey } from "./query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";


/**
 * Update a subscription.
 */
export async function updateSubscription(args: {
  subscriptionId: string,
  data: Partial<Subscription>
}): Promise<void> {
  await apiFetch({
    path: `/subscriptions/${args.subscriptionId}`,
    method: 'PATCH',
    body: snakecaseKeys({ data: args.data }, { deep: true })
  })
}


export function useUpdateSubscription() {
  const qc = useQueryClient()

  return useMutation<void, unknown, { subscriptionId: string, data: Partial<Subscription> }, { prevList?: Subscription[] | undefined, prevItem?: Subscription | undefined }>({
    mutationFn: args => updateSubscription(args),
    onMutate: async ({ subscriptionId, data }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: subscriptionsKey }),
        qc.cancelQueries({ queryKey: subscriptionKey(subscriptionId) })
      ])

      const prevList = qc.getQueryData<Subscription[]>(subscriptionsKey)
      const prevItem = qc.getQueryData<Subscription>(subscriptionKey(subscriptionId))

      // optimistic list patch
      if (prevList) {
        qc.setQueryData<Subscription[]>(subscriptionsKey, prev =>
          prev?.map(s => s.id === subscriptionId ? { ...s, ...data, updatedAt: new Date().toISOString() } as Subscription : s) ?? []
        )
      }
      // optimistic single patch
      if (prevItem) {
        qc.setQueryData<Subscription>(subscriptionKey(subscriptionId), { ...prevItem, ...data, updatedAt: new Date().toISOString() })
      }

      return { prevList, prevItem }
    },
    onError: (_err, { subscriptionId }, ctx) => {
      if (ctx?.prevList) qc.setQueryData(subscriptionsKey, ctx.prevList)
      if (ctx?.prevItem) qc.setQueryData(subscriptionKey(subscriptionId), ctx.prevItem)
    },
    onSettled: (_d, _e, { subscriptionId }) => {
      qc.invalidateQueries({ queryKey: subscriptionsKey })
      qc.invalidateQueries({ queryKey: subscriptionKey(subscriptionId) })
    }
  })
}