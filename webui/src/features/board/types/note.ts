import { generateUuid } from "@/lib/common"
import type { IconProperty, PositionProperty, SizeProperty } from "./property"
import { createDefaultStyle, type NodeType, type Style } from "./style"


/**
 * Interface for properties of a note.
 */
export interface NoteProperties {
  nodePosition?: PositionProperty
  nodeSize?: SizeProperty
  emoji?: IconProperty
}


/**
 * Interface for content of a note.
 */
export interface RichText {
  markdown: string
}


/**
 * Interface for a note.
 */
export interface Note extends Record<string, unknown> {
  id: string
  type: "note"
  version: number

  createdAt?: string
  updatedAt?: string
  deletedAt?: string

  properties?: NoteProperties

  label?: RichText
  content?: RichText

  graphUid: string
  style: Style

  minWidth?: number
  minHeight?: number
}


export const createDefaultNoteProperties = (): NoteProperties => ({
  nodePosition: {
    position: { x: 0, y: 0 },
    type: "position",
  },
  nodeSize: {
    size: { width: 100, height: 100 },
    type: "size",
  },
  emoji: {
    type: "icon",
    icon: { type: "emoji", emoji: "" },
  }
})


/**
 * Function to create a default note.
 * @param boardId - The ID of the board to which the note belongs.
 * @returns A new note with default properties.
 */
export const createDefaultNote = ({
  boardId,
  nodeType = 'rectangle'
}: {
  boardId: string,
  nodeType?: NodeType
}): Note => ({
  id: generateUuid(),
  type: "note",
  version: 1,
  createdAt: new Date().toISOString(),
  graphUid: boardId,
  style: { ...createDefaultStyle({ type: nodeType }) },
  minWidth: 100,
  minHeight: 100,
  properties: createDefaultNoteProperties(),
})