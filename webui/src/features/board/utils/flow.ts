import { Position, type InternalNode, type Node } from '@xyflow/react'

type Point = { x: number; y: number }
type Rect = { x: number; y: number; w: number; h: number }
export type ShapeType = 'rectangle' | 'ellipse' | 'diamond'

export type NodeGeometry = {
  x: number
  y: number
  w: number
  h: number
  shape: ShapeType
}

/**
 * Read the visual shape of a node from node.data.style.type.
 * Treat 'sheet' and 'text' as rectangles.
 */
function getNodeShape(node: InternalNode<Node>): ShapeType {
  const t = (node.data?.style as { type?: string } | undefined)?.type
  if (t === 'ellipse' || t === 'layered-circle') return 'ellipse'
  if (t === 'diamond' || t === 'soft-diamond' || t === 'layered-diamond') return 'diamond'
  return 'rectangle'
}

export function toNodeGeometry(node: InternalNode<Node>): NodeGeometry {
  const pos = node.internals.positionAbsolute
  const w = node.measured.width ?? 1
  const h = node.measured.height ?? 1
  return {
    x: pos.x,
    y: pos.y,
    w,
    h,
    shape: getNodeShape(node),
  }
}

function nodeRect(n: InternalNode<Node>): Rect {
  const pos = n.internals.positionAbsolute
  const w = n.measured.width ?? 1
  const h = n.measured.height ?? 1
  return { x: pos.x, y: pos.y, w, h }
}

export function nodeCenterFromGeometry(n: NodeGeometry): Point {
  return { x: n.x + n.w / 2, y: n.y + n.h / 2 }
}

export function nodeCenter(n: InternalNode<Node>): Point {
  const r = nodeRect(n)
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 }
}

/**
 * Point-in-node for rectangle, ellipse, diamond.
 */
export function pointInGeometry(p: Point, node: NodeGeometry): boolean {
  const { x, y, w, h } = node
  const cx = x + w / 2
  const cy = y + h / 2

  if (node.shape === 'ellipse') {
    const dx = (p.x - cx) / (w / 2)
    const dy = (p.y - cy) / (h / 2)
    return dx * dx + dy * dy <= 1
  }

  if (node.shape === 'diamond') {
    const dx = Math.abs(p.x - cx) / (w / 2)
    const dy = Math.abs(p.y - cy) / (h / 2)
    return dx + dy <= 1
  }

  return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h
}

/**
 * Point-in-node for InternalNode or NodeGeometry
 */
export function pointInNode(p: Point, node: InternalNode<Node> | NodeGeometry): boolean {
  const geom = 'internals' in node ? toNodeGeometry(node) : node
  return pointInGeometry(p, geom)
}

/**
 * Find boundary intersection on the ray from the node center toward targetPoint.
 * This is shape-agnostic via in/out checks + bisection.
 */
function boundaryIntersectionTowardGeometry(
  node: NodeGeometry,
  targetPoint: Point,
  iters = 20
): Point {
  const c = nodeCenterFromGeometry(node)

  // Ensure the far point is *outside* the node
  const dir = { x: targetPoint.x - c.x, y: targetPoint.y - c.y }
  const len = Math.hypot(dir.x, dir.y) || 1
  const ux = dir.x / len
  const uy = dir.y / len

  const farDist = Math.max(node.w, node.h) * 4
  let a = c
  let b: Point = { x: c.x + ux * farDist, y: c.y + uy * farDist }

  if (pointInGeometry(b, node)) {
    b = { x: c.x + ux * farDist * 8, y: c.y + uy * farDist * 8 }
  }

  for (let k = 0; k < iters; k++) {
    const mid: Point = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    if (pointInGeometry(mid, node)) {
      a = mid
    } else {
      b = mid
    }
  }

  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/**
 * Choose XYFlow Position (Left/Right/Top/Bottom) based on where the boundary
 * point lies relative to the node center. Works for all shapes.
 */
function edgeSideForPointGeometry(node: NodeGeometry, boundary: Point): Position {
  const c = nodeCenterFromGeometry(node)

  const dx = boundary.x - c.x
  const dy = boundary.y - c.y

  const nx = dx / (node.w / 2 || 1)
  const ny = dy / (node.h / 2 || 1)

  if (Math.abs(nx) > Math.abs(ny)) {
    return nx < 0 ? Position.Left : Position.Right
  } else {
    return ny < 0 ? Position.Top : Position.Bottom
  }
}

/**
 * Returns the parameters (sx, sy, tx, ty, sourcePos, targetPos) needed to create an edge.
 * Now shape-aware (rectangle/ellipse/diamond).
 */
export function getEdgeParamsFromGeometry(
  source: NodeGeometry,
  target: NodeGeometry
): {
  sx: number
  sy: number
  tx: number
  ty: number
  sourcePos: Position
  targetPos: Position
} {
  const tc = nodeCenterFromGeometry(target)
  const sc = nodeCenterFromGeometry(source)

  const sourceBoundary = boundaryIntersectionTowardGeometry(source, tc)
  const targetBoundary = boundaryIntersectionTowardGeometry(target, sc)

  const sourcePos = edgeSideForPointGeometry(source, sourceBoundary)
  const targetPos = edgeSideForPointGeometry(target, targetBoundary)

  return {
    sx: sourceBoundary.x,
    sy: sourceBoundary.y,
    tx: targetBoundary.x,
    ty: targetBoundary.y,
    sourcePos,
    targetPos
  }
}

export function getEdgeParams(
  source: InternalNode<Node>,
  target: InternalNode<Node>
): {
  sx: number
  sy: number
  tx: number
  ty: number
  sourcePos: Position
  targetPos: Position
} {
  return getEdgeParamsFromGeometry(toNodeGeometry(source), toNodeGeometry(target))
}
