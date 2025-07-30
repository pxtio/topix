import { generateUuid } from "@/lib/common"
import type { IconProperty, PositionProperty, SizeProperty } from "./property"
import { defaultStyle, type Style } from "./style"


/**
 * Interface for properties of a note.
 */
export interface NoteProperties {
  nodePosition?: {
    prop: PositionProperty
  }
  nodeSize?: {
    prop: SizeProperty
  }
  emoji?: {
    prop: IconProperty
  }
}


/**
 * Interface for content of a note.
 */
export interface Content {
  markdown: string
}


/**
 * Interface for a note.
 */
export interface Note {
  id: string
  type: "note"
  version: number

  createdAt?: string
  updatedAt?: string
  deletedAt?: string

  properties?: NoteProperties

  label?: string
  content?: Content

  graphUid: string
  style: Style

  saved?: boolean
}


/**
 * Function to create a default note.
 * @param boardId - The ID of the board to which the note belongs.
 * @returns A new note with default properties.
 */
export const createDefaultNote = (boardId: string): Note => ({
  id: generateUuid(),
  type: "note",
  version: 1,
  createdAt: new Date().toISOString(),
  graphUid: boardId,
  style: { ...defaultStyle },
  saved: false
})