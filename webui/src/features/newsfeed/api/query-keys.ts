// central query keys to avoid typos
export const subscriptionsKey = ['subscriptions'] as const
export const subscriptionKey = (subscriptionId: string) =>
  ['subscriptions', subscriptionId] as const

export const newsfeedsKey = (subscriptionId: string) =>
  ['subscriptions', subscriptionId, 'newsfeeds'] as const
export const newsfeedKey = (subscriptionId: string, newsfeedId: string) =>
  ['subscriptions', subscriptionId, 'newsfeeds', newsfeedId] as const
