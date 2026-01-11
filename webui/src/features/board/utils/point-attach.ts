import type { NoteNode } from '../types/flow'

type Point = { x: number; y: number }
type Rect = { x: number; y: number; w: number; h: number }
type ShapeType = 'rectangle' | 'ellipse' | 'diamond'

function getNodeShape(node: NoteNode): ShapeType {
  const t = node.data?.style?.type
  if (t === 'ellipse' || t === 'layered-circle') return 'ellipse'
  if (t === 'diamond' || t === 'soft-diamond' || t === 'layered-diamond') return 'diamond'
  return 'rectangle'
}

function nodeRect(node: NoteNode): Rect {
  const w = node.measured?.width ?? node.width ?? 1
  const h = node.measured?.height ?? node.height ?? 1
  return { x: node.position.x, y: node.position.y, w, h }
}

export function nodeCenter(node: NoteNode): Point {
  const r = nodeRect(node)
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 }
}

export function pointInNoteNode(p: Point, node: NoteNode): boolean {
  const { x, y, w, h } = nodeRect(node)
  const cx = x + w / 2
  const cy = y + h / 2

  const shape = getNodeShape(node)
  if (shape === 'ellipse') {
    const dx = (p.x - cx) / (w / 2)
    const dy = (p.y - cy) / (h / 2)
    return dx * dx + dy * dy <= 1
  }

  if (shape === 'diamond') {
    const dx = Math.abs(p.x - cx) / (w / 2)
    const dy = Math.abs(p.y - cy) / (h / 2)
    return dx + dy <= 1
  }

  return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h
}

function boundaryPointToward(node: NoteNode, targetPoint: Point, iters = 20): Point {
  const c = nodeCenter(node)
  const dir = { x: targetPoint.x - c.x, y: targetPoint.y - c.y }
  const len = Math.hypot(dir.x, dir.y) || 1
  const ux = dir.x / len
  const uy = dir.y / len

  const { w, h } = nodeRect(node)
  const farDist = Math.max(w, h) * 4
  let a = c
  let b = { x: c.x + ux * farDist, y: c.y + uy * farDist }

  if (pointInNoteNode(b, node)) {
    b = { x: c.x + ux * farDist * 8, y: c.y + uy * farDist * 8 }
  }

  for (let k = 0; k < iters; k++) {
    const mid: Point = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    if (pointInNoteNode(mid, node)) {
      a = mid
    } else {
      b = mid
    }
  }

  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function normalize(v: Point): Point {
  const len = Math.hypot(v.x, v.y) || 1
  return { x: v.x / len, y: v.y / len }
}

export function computeAttachment(node: NoteNode, targetPoint: Point): { point: Point; direction: Point } {
  const c = nodeCenter(node)
  const dir = normalize({ x: targetPoint.x - c.x, y: targetPoint.y - c.y })
  const boundary = boundaryPointToward(node, { x: c.x + dir.x, y: c.y + dir.y })
  const inset = 6
  return { point: { x: boundary.x - dir.x * inset, y: boundary.y - dir.y * inset }, direction: dir }
}

export function boundaryFromDirection(node: NoteNode, direction: Point): Point {
  const c = nodeCenter(node)
  const dir = normalize(direction)
  const boundary = boundaryPointToward(node, { x: c.x + dir.x, y: c.y + dir.y })
  const inset = 6
  return { x: boundary.x - dir.x * inset, y: boundary.y - dir.y * inset }
}

export function findAttachTarget(point: Point, nodes: NoteNode[]): NoteNode | null {
  for (const node of nodes) {
    if ((node.data as { kind?: string }).kind === 'point') continue
    if (pointInNoteNode(point, node)) return node
  }
  return null
}
