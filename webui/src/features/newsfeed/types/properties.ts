// Property primitives for FE use (camelCase)

export type PropertyType =
  | 'number'
  | 'date'
  | 'boolean'
  | 'text'
  | 'multi_text'
  | 'keyword'
  | 'multi_keyword'
  | 'location'
  | 'position'
  | 'size'
  | 'icon'
  | 'image'
  | 'file'
  | 'url'
  | 'reasoning'
  | 'multi_source'

export interface BaseProperty<TType extends PropertyType> {
  id: string
  type: TType
}

export interface NumberProperty extends BaseProperty<'number'> {
  number?: number
}

export interface DateProperty extends BaseProperty<'date'> {
  date?: string
}

export interface BooleanProperty extends BaseProperty<'boolean'> {
  boolean?: boolean
}

export interface TextProperty extends BaseProperty<'text'> {
  text?: string
  searchable?: boolean
}

export interface KeywordProperty extends BaseProperty<'keyword'> {
  value?: number | string
}

export interface MultiTextProperty extends BaseProperty<'multi_text'> {
  texts?: string[]
}

export interface MultiKeywordProperty extends BaseProperty<'multi_keyword'> {
  values?: Array<number | string>
}

export interface IconProperty extends BaseProperty<'icon'> {
  icon?:
    | { type: 'icon', icon: string }
    | { type: 'emoji', emoji: string }
}

export interface ImageProperty extends BaseProperty<'image'> {
  image?: { url: string, caption?: string }
}

export interface FileProperty extends BaseProperty<'file'> {
  file?: { url: string, name: string, size?: number, mime_type?: string }
}

export interface URLProperty extends BaseProperty<'url'> {
  url?: { url: string }
}

export interface LocationProperty extends BaseProperty<'location'> {
  location?: { latitude: number, longitude: number }
}

export interface PositionProperty extends BaseProperty<'position'> {
  position?: { x: number, y: number }
}

export interface SizeProperty extends BaseProperty<'size'> {
  size?: { width: number, height: number }
}

export interface ReasoningProperty extends BaseProperty<'reasoning'> {
  reasoning?: unknown[]
}

// minimal search result for MultiSourceProperty
export interface SearchResult {
  url: string
  title?: string
  snippet?: string
  source?: string
  publishedAt?: string
}

export interface MultiSourceProperty extends BaseProperty<'multi_source'> {
  sources?: SearchResult[]
}

export type DataProperty =
  | NumberProperty
  | DateProperty
  | BooleanProperty
  | TextProperty
  | IconProperty
  | ImageProperty
  | FileProperty
  | URLProperty
  | MultiTextProperty
  | KeywordProperty
  | MultiKeywordProperty
  | LocationProperty
  | PositionProperty
  | SizeProperty
  | ReasoningProperty
