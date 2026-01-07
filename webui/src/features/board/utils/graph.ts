import { uuidToNumber } from "@/lib/common"
import type { LinkEdge, NoteNode } from "../types/flow"
import { createDefaultLinkProperties, type Link } from "../types/link"
import { createDefaultNoteProperties, type Note } from "../types/note"
import { createDefaultLinkStyle } from "../types/style"


/**
 * Function to convert a Note to a NoteNode.
 * @param note - The note to convert.
 * @returns A NoteNode representation of the note.
 */
export const convertNoteToNode = (note: Note): NoteNode => {
  const position = note.properties?.nodePosition?.position || { x: 0, y: 0 }
  const size = note.properties?.nodeSize?.size || { width: 300, height: 100 }
  const zIndex = note.properties?.nodeZIndex?.number || 0

  const type = note.style.type
  const isSheet = type === 'sheet'

  const width = !isSheet ? size.width : undefined
  const height = !isSheet ? size.height : undefined

  const roughSeed = uuidToNumber(note.id)

  return {
    id: note.id,
    type: 'default',
    position,
    data: { ...note, roughSeed },
    selected: false,
    draggable: true,
    height: height,
    width: width,
    measured: { width: width, height: height },
    zIndex: zIndex
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
    data: {
      ...link,
      properties: link.properties ?? createDefaultLinkProperties(),
    },
    selected: false,
    animated: false,
  }
}


/**
 * Function to convert a NoteNode back to a Note.
 */
export const convertNodeToNote = (node: NoteNode): Note => {
  if ((node.data as { kind?: string }).kind === 'point') {
    throw new Error("convertNodeToNote: point nodes are not persistable")
  }
  const note = { ...node.data }

  const graphUid = note.graphUid ?? node.data?.graphUid
  if (!graphUid) {
    throw new Error("convertNodeToNote: missing graphUid on node")
  }
  note.id = node.id
  note.graphUid = graphUid
  note.properties = note.properties || createDefaultNoteProperties({ type: note.style.type })

  if (node.position) {
    note.properties.nodePosition = {
      position: node.position,
      type: "position"
    }
  }

  if (node.measured) {
    note.properties.nodeSize = {
      size: { width: node.measured.width || 100, height: node.measured.height || 100 },
      type: "size",
    }
  }

  if (node.zIndex !== undefined) {
    note.properties.nodeZIndex = {
      number: node.zIndex,
      type: "number",
    }
  }

  return note
}


/**
 * Function to convert a LinkEdge back to a Link.
 */
export const convertEdgeToLink = (edge: LinkEdge): Link => {
  const graphUid = (edge.data as Link | undefined)?.graphUid
  if (!graphUid) {
    throw new Error("convertEdgeToLink: missing graphUid on edge")
  }

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'link',
    version: 1,
    properties: edge.data?.properties ?? createDefaultLinkProperties(),
    createdAt: edge.data?.createdAt || new Date().toISOString(),
    updatedAt: edge.data?.updatedAt,
    deletedAt: edge.data?.deletedAt,
    style: edge.data?.style || createDefaultLinkStyle(),
    graphUid,
    label: edge.data?.label
  }
}
