/**
 * Represents a URL annotation.
 */
export interface UrlAnnotation {
  type: "url"
  url: string
  title?: string
  content?: string
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

export type ToolOutput = WebSearchOutput | MemorySearchOutput | CodeInterpreterOutput | string