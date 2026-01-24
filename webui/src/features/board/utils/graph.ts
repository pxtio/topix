import { uuidToNumber } from "@/lib/common"
import type { LinkEdge, NoteNode } from "../types/flow"
import { createDefaultLinkProperties, type Link } from "../types/link"
import type { Document } from "../types/document"
import { createDefaultNoteProperties, type Note } from "../types/note"
import { createDefaultLinkStyle } from "../types/style"
import { nodeCenter } from "./point-attach"
import { POINT_NODE_SIZE } from "../components/flow/point-node"

type PointPair = {
  points: NoteNode[]
  edge: LinkEdge
}

/**
 * Function to convert a Note or Document to a NoteNode.
 * @param note - The note or document to convert.
 * @returns A NoteNode representation of the note or document.
 */
export const convertNoteToNode = (note: Note | Document): NoteNode => {
  const position = note.properties?.nodePosition?.position || { x: 0, y: 0 }
  const size = note.properties?.nodeSize?.size || { width: 300, height: 100 }
  const zIndex =
    note.type === "note" ? note.properties?.nodeZIndex?.number || 0 : 0

  const noteId = String(note.id)

  if (note.type === "document") {
    const width = size.width
    const height = size.height
    const roughSeed = uuidToNumber(noteId)

    return {
      id: noteId,
      type: "document",
      position,
      data: { ...note, roughSeed } as unknown as NoteNode["data"],
      selected: false,
      draggable: true,
      height: height,
      width: width,
      measured: { width: width, height: height },
      zIndex: zIndex,
    }
  }

  const type = note.style.type
  const isSheet = type === 'sheet'

  const width = !isSheet ? size.width : undefined
  const height = !isSheet ? size.height : undefined

  const roughSeed = uuidToNumber(noteId)

  return {
    id: noteId,
    type: 'default',
    position,
    data: { ...note, roughSeed } as unknown as NoteNode["data"],
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

export const convertLinkToEdgeWithPoints = (
  link: Link,
  nodesById?: Map<string, NoteNode>,
): PointPair => {
  const edge = convertLinkToEdge(link)
  const start = link.properties?.startPoint?.position
  const end = link.properties?.endPoint?.position
  const startTarget = nodesById?.get(link.source)
  const endTarget = nodesById?.get(link.target)
  const offset = POINT_NODE_SIZE / 2

  if (!start && !end && !(startTarget && endTarget)) {
    return { edge, points: [] }
  }
  if (!start && !startTarget) {
    return { edge, points: [] }
  }
  if (!end && !endTarget) {
    return { edge, points: [] }
  }

  const startId = `${link.id}-start`
  const endId = `${link.id}-end`
  const fallbackStart = start ?? (startTarget
    ? { x: nodeCenter(startTarget).x - offset, y: nodeCenter(startTarget).y - offset }
    : undefined)
  const fallbackEnd = end ?? (endTarget
    ? { x: nodeCenter(endTarget).x - offset, y: nodeCenter(endTarget).y - offset }
    : undefined)

  if (!fallbackStart || !fallbackEnd) {
    return { edge, points: [] }
  }

  const startCenter = { x: fallbackStart.x + offset, y: fallbackStart.y + offset }
  const endCenter = { x: fallbackEnd.x + offset, y: fallbackEnd.y + offset }

  const startNode: NoteNode = {
    id: startId,
    type: 'point',
    zIndex: 1001,
    position: fallbackStart,
    data: {
      kind: 'point',
      attachedToNodeId: startTarget?.id,
      attachedDirection: startTarget
        ? {
            x: startCenter.x - nodeCenter(startTarget).x,
            y: startCenter.y - nodeCenter(startTarget).y,
          }
        : undefined,
    } as NoteNode['data'],
    draggable: true,
    selectable: true,
  }

  const endNode: NoteNode = {
    id: endId,
    type: 'point',
    zIndex: 1001,
    position: fallbackEnd,
    data: {
      kind: 'point',
      attachedToNodeId: endTarget?.id,
      attachedDirection: endTarget
        ? {
            x: endCenter.x - nodeCenter(endTarget).x,
            y: endCenter.y - nodeCenter(endTarget).y,
          }
        : undefined,
    } as NoteNode['data'],
    draggable: true,
    selectable: true,
  }

  return {
    points: [startNode, endNode],
    edge: {
      ...edge,
      source: startId,
      target: endId,
      sourceHandle: 'point',
      targetHandle: 'point',
    },
  }
}


/**
 * Function to convert a NoteNode back to a Note.
 */
export const convertNodeToNote = (node: NoteNode): Note | Document | null => {
  if ((node.data as { kind?: string }).kind === 'point') {
    return null
  }
  const note = { ...node.data } as Note | Document

  const graphUid = note.graphUid ?? node.data?.graphUid
  if (!graphUid) {
    throw new Error("convertNodeToNote: missing graphUid on node")
  }
  note.id = node.id
  note.graphUid = graphUid
  if (note.type === "note") {
    note.properties = note.properties || createDefaultNoteProperties({ type: note.style.type })
  }

  if (node.position) {
    note.properties = note.properties || (note.type === "note"
      ? createDefaultNoteProperties({ type: note.style.type })
      : note.properties)
    note.properties.nodePosition = {
      position: node.position,
      type: "position"
    }
  }

  if (node.measured) {
    note.properties = note.properties || (note.type === "note"
      ? createDefaultNoteProperties({ type: note.style.type })
      : note.properties)
    note.properties.nodeSize = {
      size: { width: node.measured.width || 100, height: node.measured.height || 100 },
      type: "size",
    }
  }

  if (node.zIndex !== undefined) {
    if (note.type === "note") {
      note.properties.nodeZIndex = {
        number: node.zIndex,
        type: "number",
      }
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

export const convertEdgeToLinkWithPoints = (
  edge: LinkEdge,
  nodesById: Map<string, NoteNode>,
): Link => {
  const link = convertEdgeToLink(edge)
  const sourceNode = nodesById.get(edge.source)
  const targetNode = nodesById.get(edge.target)

  const isPoint = (node?: NoteNode) =>
    Boolean(node && (node.data as { kind?: string }).kind === 'point')

  const sourceAttachedTo = isPoint(sourceNode)
    ? (sourceNode?.data as { attachedToNodeId?: string }).attachedToNodeId
    : undefined
  const targetAttachedTo = isPoint(targetNode)
    ? (targetNode?.data as { attachedToNodeId?: string }).attachedToNodeId
    : undefined

  const nextProps = link.properties ?? createDefaultLinkProperties()

  if (isPoint(sourceNode)) {
    nextProps.startPoint = {
      type: 'position',
      position: sourceNode?.position,
    }
  }
  if (isPoint(targetNode)) {
    nextProps.endPoint = {
      type: 'position',
      position: targetNode?.position,
    }
  }

  // Persist attached endpoints as real node ids when available.
  return {
    ...link,
    source: sourceAttachedTo ?? link.source,
    target: targetAttachedTo ?? link.target,
    properties: nextProps,
  }
}
