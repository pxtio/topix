import { uuidToNumber } from "@/lib/common"
import type { LinkEdge, NoteNode } from "../types/flow"
import { createDefaultLinkProperties, type Link } from "../types/link"
import { createDefaultNoteProperties, type Note } from "../types/note"
import { createDefaultLinkStyle } from "../types/style"
import { computeAttachment, nodeCenter } from "./point-attach"

type PointPair = {
  points: NoteNode[]
  edge: LinkEdge
}

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

export const convertLinkToEdgeWithPoints = (
  link: Link,
  nodesById?: Map<string, NoteNode>,
): PointPair => {
  const edge = convertLinkToEdge(link)
  const start = link.properties?.startPoint?.position
  const end = link.properties?.endPoint?.position
  const startTarget = nodesById?.get(link.source)
  const endTarget = nodesById?.get(link.target)

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
  const startFallback = start ?? (startTarget ? nodeCenter(startTarget) : undefined)
  const endFallback = end ?? (endTarget ? nodeCenter(endTarget) : undefined)
  const classicStart = !start && startTarget && endTarget
    ? computeAttachment(startTarget, nodeCenter(endTarget))
    : null
  const classicEnd = !end && startTarget && endTarget
    ? computeAttachment(endTarget, nodeCenter(startTarget))
    : null

  const fallbackStart = classicStart?.point ?? startFallback
  const fallbackEnd = classicEnd?.point ?? endFallback

  if (!fallbackStart || !fallbackEnd) {
    return { edge, points: [] }
  }

  // If endpoint is attached to a node, preserve explicit positions when present.
  const startAttach = classicStart ?? (startTarget
    ? computeAttachment(startTarget, start ?? fallbackStart)
    : null)
  const endAttach = classicEnd ?? (endTarget
    ? computeAttachment(endTarget, end ?? fallbackEnd)
    : null)

  const startNode: NoteNode = {
    id: startId,
    type: 'point',
    position: start ?? (startAttach?.point ?? fallbackStart),
    data: {
      kind: 'point',
      attachedToNodeId: startTarget?.id,
      attachedDirection: startTarget
        ? (startAttach?.direction ?? {
            x: (start ?? fallbackStart).x - nodeCenter(startTarget).x,
            y: (start ?? fallbackStart).y - nodeCenter(startTarget).y,
          })
        : undefined,
    } as NoteNode['data'],
    draggable: true,
    selectable: true,
  }

  const endNode: NoteNode = {
    id: endId,
    type: 'point',
    position: end ?? (endAttach?.point ?? fallbackEnd),
    data: {
      kind: 'point',
      attachedToNodeId: endTarget?.id,
      attachedDirection: endTarget
        ? (endAttach?.direction ?? {
            x: (end ?? fallbackEnd).x - nodeCenter(endTarget).x,
            y: (end ?? fallbackEnd).y - nodeCenter(endTarget).y,
          })
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
export const convertNodeToNote = (node: NoteNode): Note | null => {
  if ((node.data as { kind?: string }).kind === 'point') {
    return null
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
