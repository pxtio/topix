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

export function computeAttachment(node: NoteNode, targetPoint: Point): { point: Point; direction: Point } {
  const c = nodeCenter(node)
  return {
    point: targetPoint,
    direction: { x: targetPoint.x - c.x, y: targetPoint.y - c.y },
  }
}

export function findAttachTarget(point: Point, nodes: NoteNode[]): NoteNode | null {
  const ordered = [...nodes].sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0))
  for (const node of ordered) {
    if ((node.data as { kind?: string }).kind === 'point') continue
    if (pointInNoteNode(point, node)) return node
  }
  return null
}
