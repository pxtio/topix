import { apiFetch } from "@/api"
import type { Subscription } from "../types/subscription"
import camelcaseKeys from "camelcase-keys"
import { useQuery } from "@tanstack/react-query"
import { subscriptionKey } from "./query-keys"

/**
 * Get a specific subscription by ID.
 */
export async function getSubscription(subscriptionId: string): Promise<Subscription> {
  const res = await apiFetch<{ data: Record<string, unknown> }>({
    path: `/subscriptions/${subscriptionId}`,
    method: 'GET'
  })
  const data = camelcaseKeys(res.data, { deep: true })
  return data.subscription as Subscription
}

/**
 * React query hook to get a specific subscription by ID.
 */
export function useGetSubscription(subscriptionId: string | undefined) {
  return useQuery<Subscription>({
    queryKey: subscriptionKey(subscriptionId ?? ''),
    queryFn: () => getSubscription(subscriptionId as string),
    enabled: !!subscriptionId
  })
}