import { generateUuid, uuidToNumber } from "@/lib/common"
import { createDefaultStyle, type NodeType, type Style } from "./style"
import type { BooleanProperty, IconProperty, ImageProperty, NumberProperty, PositionProperty, SizeProperty, URLProperty } from "@/features/newsfeed/types/properties"


/**
 * Interface for properties of a note.
 */
export interface NoteProperties {
  nodePosition: PositionProperty
  nodeSize: SizeProperty
  emoji: IconProperty
  pinned: BooleanProperty
  listOrder: NumberProperty
  url: URLProperty
  imageUrl: ImageProperty
  icon: IconProperty
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

  properties: NoteProperties

  label?: RichText
  content?: RichText

  graphUid: string
  style: Style

  minWidth?: number
  minHeight?: number

  roughSeed?: number
  // only used client-side
  isNew?: boolean
}


export const DEFAULT_NOTE_WIDTH = 200
export const DEFAULT_NOTE_HEIGHT = 50

export const DEFAULT_STICKY_NOTE_WIDTH = 300
export const DEFAULT_STICKY_NOTE_HEIGHT = 300


/**
 * Function to create default properties for a note.
 * @returns Default properties for a note.
 */
export const createDefaultNoteProperties = ({ type = 'rectangle' }: { type?: NodeType }): NoteProperties => {
  const defaultSize = type === 'sheet' ?
    { width: DEFAULT_STICKY_NOTE_WIDTH, height: DEFAULT_STICKY_NOTE_HEIGHT }
    : { width: DEFAULT_NOTE_WIDTH, height: DEFAULT_NOTE_HEIGHT }
  return {
    nodePosition: {
      position: { x: 0, y: 0 },
      type: "position",
    },
    nodeSize: {
      size: defaultSize,
      type: "size",
    },
    emoji: {
      type: "icon",
      icon: { type: "emoji", emoji: "" },
    },
    pinned: {
      type: "boolean",
      boolean: false,
    },
    listOrder: {
      type: "number",
      number: 0,
    },
    url: { type: "url" },
    imageUrl: { type: "image" },
    icon: { type: "icon" }
  }
}


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
}): Note => {
  const id = generateUuid()
  const roughSeed = uuidToNumber(id)

  return {
    id: id,
    type: "note",
    version: 1,
    createdAt: new Date().toISOString(),
    graphUid: boardId,
    style: { ...createDefaultStyle({ type: nodeType }) },
    minWidth: DEFAULT_NOTE_WIDTH,
    minHeight: DEFAULT_NOTE_HEIGHT,
    properties: createDefaultNoteProperties({ type: nodeType }),
    roughSeed
  }
}