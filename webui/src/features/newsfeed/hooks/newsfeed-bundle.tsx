import { useListNewsfeeds } from "../api/list-newsfeeds"
import { useGetSubscription } from "../api/get-subscription"

/**
 * Bundle hook to get a subscription and its newsfeeds.
 */
export function useNewsfeedsBundle(subscriptionId: string | undefined) {
  const sub = useGetSubscription(subscriptionId)
  const feeds = useListNewsfeeds(subscriptionId)
  return { sub, feeds }
}