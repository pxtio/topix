/**
 * Represents a URL annotation.
 */
export interface UrlAnnotation {
  type: "url"
  url: string
  title?: string
  content?: string
  favicon?: string
  coverImage?: string
  sourceDomain?: string
  publishedAt?: string // ISO 8601 date string
  tags?: string[]
}

export interface FileAnnotation {
  type: "file"
  fileType: string
  filePath: string
  fileId: string
}

export interface RefAnnotation {
  type: "reference"
  refId: string
}

export type Annotation = UrlAnnotation | FileAnnotation | RefAnnotation

export interface WebSearchOutput {
  type: "web_search"
  answer: string
  searchResults: UrlAnnotation[]
}

export interface MemorySearchOutput {
  type: "memory_search"
  answer: string
  references: RefAnnotation[]
}

export interface CodeInterpreterOutput {
  type: "code_interpreter"
  answer: string
  executedCode: string
  annotations: FileAnnotation[]
}

export interface WeatherWidgetOutput {
  type: "display_weather_widget"
  city: string
}

export interface StockWidgetOutput {
  type: "display_stock_widget"
  symbol: string
}

export type ToolOutput = WebSearchOutput | MemorySearchOutput | CodeInterpreterOutput | WeatherWidgetOutput | StockWidgetOutput | string