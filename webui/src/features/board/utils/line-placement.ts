import type { InternalNode, Node } from '@xyflow/react'
import { generateUuid } from '@/lib/common'
import type { LinkEdge, NoteNode } from '../types/flow'
import type { Link } from '../types/link'
import { createDefaultLinkProperties } from '../types/link'
import { createDefaultLinkStyle } from '../types/style'
import { pointInNode } from './flow'
import { POINT_NODE_SIZE } from '../components/flow/point-node'

type Point = { x: number; y: number }

type LinePlacementInput = {
  start: Point
  end: Point
  boardId: string
  internalNodes: Map<string, InternalNode<Node>>
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
}: LinePlacementInput): LinePlacementResult {
  const candidateNodes = Array.from(internalNodes.values()).filter(n => {
    const data = n.data as { kind?: string } | undefined
    return data?.kind !== 'point'
  })

  const startHit = candidateNodes.find(n => pointInNode(start, n)) ?? null
  const endHit = candidateNodes.find(n => pointInNode(end, n)) ?? null

  const edgeId = generateUuid()
  const pointAId = `${edgeId}-start`
  const pointBId = `${edgeId}-end`
  const offset = POINT_NODE_SIZE / 2

  const pointNodes: NoteNode[] = []

  const pointA = startHit
    ? null
    : ({
        id: pointAId,
        type: 'point',
        position: { x: start.x - offset, y: start.y - offset },
        data: { kind: 'point' },
        draggable: true,
        selectable: true,
      } as NoteNode)

  const pointB = endHit
    ? null
    : ({
        id: pointBId,
        type: 'point',
        position: { x: end.x - offset, y: end.y - offset },
        data: { kind: 'point' },
        draggable: true,
        selectable: true,
      } as NoteNode)

  if (pointA) pointNodes.push(pointA)
  if (pointB) pointNodes.push(pointB)

  const edge: LinkEdge = {
    id: edgeId,
    type: 'default',
    source: startHit?.id ?? pointAId,
    target: endHit?.id ?? pointBId,
    sourceHandle: startHit ? undefined : 'point',
    targetHandle: endHit ? undefined : 'point',
    data: {
      id: edgeId,
      type: 'link',
      version: 1,
      source: startHit?.id ?? pointAId,
      target: endHit?.id ?? pointBId,
      properties: {
        ...createDefaultLinkProperties(),
        ...(!startHit && pointA
          ? { startPoint: { type: 'position', position: pointA.position } }
          : {}),
        ...(!endHit && pointB
          ? { endPoint: { type: 'position', position: pointB.position } }
          : {}),
      },
      style: { ...createDefaultLinkStyle(), pathStyle: 'straight' },
      createdAt: new Date().toISOString(),
      graphUid: boardId,
    } as Link,
  }

  return { pointNodes, edge }
}
