import type { LinkEdge, NoteNode } from "../types/flow"
import type { Link } from "../types/link"
import type { Note } from "../types/note"


/**
 * Function to convert a Note to a NoteNode.
 * @param note - The note to convert.
 * @returns A NoteNode representation of the note.
 */
export const convertNoteToNode = (note: Note): NoteNode => {
  const position = note.properties?.nodePosition?.prop.position || { x: 0, y: 0 }

  return {
    id: note.id,
    type: 'default',
    position,
    data: note,
    selected: false,
    draggable: true
  }
}


/**
 * Function to convert a Link to a LinkEdge.
 * @param link - The link to convert.
 * @returns A LinkEdge representation of the link.
 */
export const convertLinkToEdge = (link: Link): LinkEdge => {
  return {
    id: link.id,
    type: 'default',
    source: link.source,
    target: link.target,
    data: link,
    selected: false,
    animated: false
  }
}