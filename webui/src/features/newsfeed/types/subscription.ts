import type {
  BooleanProperty,
  IconProperty,
  MultiTextProperty,
  TextProperty
} from './properties'
import type { RichText } from '@/features/board/types/note'

/**
 * Recurrence options for a subscription.
 */
export type Recurrence = 'daily' | 'weekly' | 'monthly' | 'yearly'


/**
 * Properties specific to a subscription.
 */
export interface SubscriptionProperties {
  rawDescription?: TextProperty
  emoji?: IconProperty
  subTopics?: MultiTextProperty
  description?: TextProperty
  keywords?: MultiTextProperty
  seedSources?: MultiTextProperty
  recurrence?: TextProperty
  collectionRunning?: BooleanProperty
}


/**
 * A subscription to a news source or topic.
 */
export interface Subscription {
  id: string
  type: 'subscription'
  properties?: SubscriptionProperties

  label: RichText
  userUid?: string

  createdAt: string
  updatedAt: string
  deletedAt?: string
}
