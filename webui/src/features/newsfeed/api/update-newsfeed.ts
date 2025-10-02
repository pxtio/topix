import { apiFetch } from "@/api"
import type { Newsfeed } from "../types/newsfeed"
import snakecaseKeys from "snakecase-keys"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { newsfeedKey, newsfeedsKey } from "./query-keys"


/**
 * Update a newsfeed item.
 */
export async function updateNewsfeed(args: {
  subscriptionId: string,
  newsfeedId: string,
  data: Partial<Newsfeed>
}): Promise<void> {
  await apiFetch({
    path: `/subscriptions/${args.subscriptionId}/newsfeeds/${args.newsfeedId}`,
    method: 'PATCH',
    body: snakecaseKeys({ data: args.data }, { deep: true })
  })
}


/**
 * React query mutation hook to update a newsfeed item.
 */
export function useUpdateNewsfeed(subscriptionId: string | undefined) {
  const qc = useQueryClient()

  return useMutation<void, unknown, { newsfeedId: string, data: Partial<Newsfeed> }, { prevList?: Newsfeed[] | undefined, prevItem?: Newsfeed | undefined }>({
    mutationFn: ({ newsfeedId, data }) =>
      updateNewsfeed({ subscriptionId: subscriptionId as string, newsfeedId, data }),
    onMutate: async ({ newsfeedId, data }) => {
      if (!subscriptionId) return {}

      await Promise.all([
        qc.cancelQueries({ queryKey: newsfeedsKey(subscriptionId) }),
        qc.cancelQueries({ queryKey: newsfeedKey(subscriptionId, newsfeedId) })
      ])

      const prevList = qc.getQueryData<Newsfeed[]>(newsfeedsKey(subscriptionId))
      const prevItem = qc.getQueryData<Newsfeed>(newsfeedKey(subscriptionId, newsfeedId))

      if (prevList) {
        qc.setQueryData<Newsfeed[]>(newsfeedsKey(subscriptionId), prev =>
          prev?.map(n => n.id === newsfeedId ? { ...n, ...data, updatedAt: new Date().toISOString() } as Newsfeed : n) ?? []
        )
      }

      if (prevItem) {
        qc.setQueryData<Newsfeed>(newsfeedKey(subscriptionId, newsfeedId), { ...prevItem, ...data, updatedAt: new Date().toISOString() })
      }

      return { prevList, prevItem }
    },
    onError: (_err, { newsfeedId }, ctx) => {
      if (!subscriptionId) return
      if (ctx?.prevList) qc.setQueryData(newsfeedsKey(subscriptionId), ctx.prevList)
      if (ctx?.prevItem) qc.setQueryData(newsfeedKey(subscriptionId, newsfeedId), ctx.prevItem)
    },
    onSettled: (_d, _e, { newsfeedId }) => {
      if (!subscriptionId) return
      qc.invalidateQueries({ queryKey: newsfeedsKey(subscriptionId) })
      qc.invalidateQueries({ queryKey: newsfeedKey(subscriptionId, newsfeedId) })
    }
  })
}