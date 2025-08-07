import type { LinkEdge, NoteNode } from "../types/flow"
import type { Link } from "../types/link"
import { createDefaultNoteProperties, type Note } from "../types/note"
import { defaultStyle } from "../types/style"


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


/**
 * Function to convert a NoteNode back to a Note.
 */
export const convertNodeToNote = (graphId: string, node: NoteNode): Note => {
  const note = { ...node.data }
  note.id = node.id
  note.graphUid = graphId
  note.properties = note.properties || createDefaultNoteProperties()
    if (node.position) {
      note.properties.nodePosition = {
      prop: {
        position: node.position,
        type: "position",
      }
    }
  }
  if (node.measured) {
    note.properties.nodeSize = {
      prop: {
        size: { width: node.measured.width || 100, height: node.measured.height || 100 },
        type: "size",
      }
    }
  }

  return note
}


/**
 * Function to convert a LinkEdge back to a Link.
 */
export const convertEdgeToLink = (graphId: string, edge: LinkEdge): Link => {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'link',
    version: 1,
    createdAt: edge.data?.createdAt || new Date().toISOString(),
    updatedAt: edge.data?.updatedAt,
    deletedAt: edge.data?.deletedAt,
    style: edge.data?.style || defaultStyle(),
    graphUid: graphId,
    label: edge.data?.label
  }
}