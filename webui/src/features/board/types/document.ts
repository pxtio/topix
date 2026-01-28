import type { TextProperty, KeywordProperty } from "@/features/newsfeed/types/properties"
import type { Note, NoteProperties } from "./note"

export type DocumentStatus = "pending" | "processing" | "completed" | "failed"

export interface DocumentProperties extends NoteProperties {
  mimeType: TextProperty
  status: KeywordProperty & { value?: DocumentStatus }
  summary: TextProperty
}

export interface Document extends Note {
  type: "document"
  properties: DocumentProperties
}
