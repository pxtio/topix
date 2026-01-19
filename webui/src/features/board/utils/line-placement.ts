import type { InternalNode, Node } from '@xyflow/react'
import { generateUuid } from '@/lib/common'
import type { LinkEdge, NoteNode } from '../types/flow'
import type { Link } from '../types/link'
import { createDefaultLinkProperties } from '../types/link'
import type { LinkStyle } from '../types/style'
import { pointInNode } from './flow'
import { POINT_NODE_SIZE } from '../components/flow/point-node'
import { computeAttachment } from './point-attach'

type Point = { x: number; y: number }

type LinePlacementInput = {
  start: Point
  end: Point
  boardId: string
  internalNodes: Map<string, InternalNode<Node>>
  style: LinkStyle
}

type LinePlacementResult = {
  pointNodes: NoteNode[]
  edge: LinkEdge
}

export function buildLinePlacement({
  start,
  end,
  boardId,
  internalNodes,
  style,
}: LinePlacementInput): LinePlacementResult {
  const candidateNodes = Array.from(internalNodes.values())
    .filter(n => {
      const data = n.data as { kind?: string } | undefined
      return data?.kind !== 'point'
    })
    .sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0))

  const startHit = candidateNodes.find(n => pointInNode(start, n)) ?? null
  const endHit = candidateNodes.find(n => pointInNode(end, n)) ?? null

  const edgeId = generateUuid()
  const pointAId = `${edgeId}-start`
  const pointBId = `${edgeId}-end`
  const offset = POINT_NODE_SIZE / 2

  const pointNodes: NoteNode[] = []

  const toNoteNode = (n: InternalNode<Node>): NoteNode => ({
    id: n.id,
    type: 'default',
    position: { x: n.internals.positionAbsolute.x, y: n.internals.positionAbsolute.y },
    measured: n.measured,
    data: n.data as NoteNode['data'],
  })

  const startAttach = startHit ? computeAttachment(toNoteNode(startHit), start) : null
  const endAttach = endHit ? computeAttachment(toNoteNode(endHit), end) : null

  const pointA: NoteNode = {
    id: pointAId,
    type: 'point',
    zIndex: 1001,
    position: {
      x: (startAttach?.point.x ?? start.x) - offset,
      y: (startAttach?.point.y ?? start.y) - offset,
    },
    data: {
      kind: 'point',
      attachedToNodeId: startHit?.id,
      attachedDirection: startAttach?.direction,
    } as NoteNode['data'],
    draggable: true,
    selectable: true,
  }

  const pointB: NoteNode = {
    id: pointBId,
    type: 'point',
    zIndex: 1001,
    position: {
      x: (endAttach?.point.x ?? end.x) - offset,
      y: (endAttach?.point.y ?? end.y) - offset,
    },
    data: {
      kind: 'point',
      attachedToNodeId: endHit?.id,
      attachedDirection: endAttach?.direction,
    } as NoteNode['data'],
    draggable: true,
    selectable: true,
  }

  pointNodes.push(pointA, pointB)

  const edge: LinkEdge = {
    id: edgeId,
    type: 'default',
    source: pointAId,
    target: pointBId,
    sourceHandle: 'point',
    targetHandle: 'point',
    data: {
      id: edgeId,
      type: 'link',
      version: 1,
      source: pointAId,
      target: pointBId,
      properties: {
        ...createDefaultLinkProperties(),
        startPoint: { type: 'position', position: pointA.position },
        endPoint: { type: 'position', position: pointB.position },
      },
      style: { ...style, pathStyle: 'bezier' },
      createdAt: new Date().toISOString(),
      graphUid: boardId,
    } as Link,
  }

  return { pointNodes, edge }
}
