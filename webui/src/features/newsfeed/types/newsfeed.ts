import type { RichText } from '@/features/board/types/note'
import type { BooleanProperty, MultiSourceProperty } from './properties'

/**
 * Properties specific to a newsfeed item.
 */
export interface NewsfeedProperties {
  newsGrid?: MultiSourceProperty,
  markedAsRead?: BooleanProperty
}

/**
 * A newsfeed item fetched from various sources.
 */
export interface Newsfeed {
  id: string
  type: 'newsfeed'
  properties?: NewsfeedProperties

  label?: RichText
  // list endpoint excludes it — keep optional on FE
  content?: RichText

  subscriptionId: string

  createdAt: string
  updatedAt: string
  deletedAt?: string

  generated?: boolean
}
