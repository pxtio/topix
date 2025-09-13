import { Position, type InternalNode, type Node } from '@xyflow/react'

type Point = { x: number; y: number }
type Rect = { x: number; y: number; w: number; h: number }
type ShapeType = 'rectangle' | 'ellipse' | 'diamond'

/**
 * Read the visual shape of a node from node.data.style.type.
 * Treat 'sheet' and 'text' as rectangles.
 */
function getNodeShape(node: InternalNode<Node>): ShapeType {
  const t = (node.data?.style as { type?: string } | undefined)?.type
  if (t === 'ellipse') return 'ellipse'
  if (t === 'diamond') return 'diamond'
  return 'rectangle'
}

function nodeRect(n: InternalNode<Node>): Rect {
  const pos = n.internals.positionAbsolute
  const w = n.measured.width ?? 1
  const h = n.measured.height ?? 1
  return { x: pos.x, y: pos.y, w, h }
}

function nodeCenter(n: InternalNode<Node>): Point {
  const r = nodeRect(n)
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 }
}

/**
 * Point-in-node for rectangle, ellipse, diamond.
 */
function pointInNode(p: Point, node: InternalNode<Node>): boolean {
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

/**
 * Find boundary intersection on the ray from the node center toward targetPoint.
 * This is shape-agnostic via in/out checks + bisection.
 */
function boundaryIntersectionToward(
  node: InternalNode<Node>,
  targetPoint: Point,
  iters = 20
): Point {
  const c = nodeCenter(node)

  // Ensure the far point is *outside* the node
  const dir = { x: targetPoint.x - c.x, y: targetPoint.y - c.y }
  const len = Math.hypot(dir.x, dir.y) || 1
  const ux = dir.x / len
  const uy = dir.y / len

  const { w, h } = nodeRect(node)
  const farDist = Math.max(w, h) * 4
  const far: Point = { x: c.x + ux * farDist, y: c.y + uy * farDist }

  let a = c
  let b = far
  if (pointInNode(b, node)) {
    b = { x: c.x + ux * farDist * 8, y: c.y + uy * farDist * 8 }
  }

  for (let k = 0; k < iters; k++) {
    const mid: Point = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    if (pointInNode(mid, node)) {
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
function edgeSideForPoint(node: InternalNode<Node>, boundary: Point): Position {
  const c = nodeCenter(node)
  const { w, h } = nodeRect(node)

  const dx = boundary.x - c.x
  const dy = boundary.y - c.y

  const nx = dx / (w / 2 || 1)
  const ny = dy / (h / 2 || 1)

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
  const tc = nodeCenter(target)
  const sc = nodeCenter(source)

  const sourceBoundary = boundaryIntersectionToward(source, tc)
  const targetBoundary = boundaryIntersectionToward(target, sc)

  const sourcePos = edgeSideForPoint(source, sourceBoundary)
  const targetPos = edgeSideForPoint(target, targetBoundary)

  return {
    sx: sourceBoundary.x,
    sy: sourceBoundary.y,
    tx: targetBoundary.x,
    ty: targetBoundary.y,
    sourcePos,
    targetPos
  }
}