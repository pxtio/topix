import type { Node, InternalNode } from '@xyflow/react'
import type { LinkStyle } from '../../../types/style'
import { pointInNode, type NodeGeometry } from '../../../utils/flow'

export type Point = { x: number; y: number }

export function trianglePath(size: number, tipFactor: number, baseFactor: number): { d: string; baseX: number; tipX: number } {
  const tipX = size * tipFactor
  const baseX = size * baseFactor
  const topY = size * 0.1
  const bottomY = size * 0.9

  const d = [
    `M ${baseX} ${topY}`,
    `L ${tipX} ${size / 2}`,
    `L ${baseX} ${bottomY}`,
    `Z`
  ].join(' ')

  return { d, baseX, tipX }
}

export function barbPaths(size: number, tipFactor: number, baseFactor: number): { p1: string; p2: string } {
  const tipX = size * tipFactor
  const baseX = size * baseFactor
  const topY = size * 0.05
  const bottomY = size * 0.95
  const midY = size / 2

  const p1 = `M ${baseX} ${topY} L ${tipX} ${midY}`
  const p2 = `M ${tipX} ${midY} L ${baseX} ${bottomY}`

  return { p1, p2 }
}

export function cssDashArray(style: LinkStyle | undefined, strokeWidth: number): string | undefined {
  if (!style) return undefined
  const sw = Math.max(0.5, strokeWidth)
  if (style.strokeStyle === 'dashed') return `${5.5 * sw} ${4 * sw}`
  if (style.strokeStyle === 'dotted') return `0 ${3 * sw}`
  return undefined
}

export function quadraticPath(p0: Point, cp: Point, p1: Point): { path: string; labelX: number; labelY: number } {
  const path = `M ${p0.x} ${p0.y} Q ${cp.x} ${cp.y} ${p1.x} ${p1.y}`
  const midX = (p0.x + 2 * cp.x + p1.x) / 4
  const midY = (p0.y + 2 * cp.y + p1.y) / 4
  return { path, labelX: midX, labelY: midY }
}

export function bendToControlPoint(bend: Point, start: Point, end: Point): Point {
  return {
    x: 2 * bend.x - 0.5 * (start.x + end.x),
    y: 2 * bend.y - 0.5 * (start.y + end.y),
  }
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  }
}

export function pointOnQuadratic(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  }
}

export function subdivideQuadratic(p0: Point, p1: Point, p2: Point, t: number): {
  first: [Point, Point, Point]
  second: [Point, Point, Point]
} {
  const p01 = lerpPoint(p0, p1, t)
  const p12 = lerpPoint(p1, p2, t)
  const p012 = lerpPoint(p01, p12, t)
  return {
    first: [p0, p01, p012],
    second: [p012, p12, p2],
  }
}

export function extractQuadraticSegment(p0: Point, p1: Point, p2: Point, t0: number, t1: number): {
  p0: Point
  p1: Point
  p2: Point
} {
  if (t0 <= 0 && t1 >= 1) {
    return { p0, p1, p2 }
  }

  const clampedT0 = Math.max(0, Math.min(1, t0))
  const clampedT1 = Math.max(clampedT0 + 1e-4, Math.min(1, t1))

  const { second } = subdivideQuadratic(p0, p1, p2, clampedT0)
  const localT = (clampedT1 - clampedT0) / (1 - clampedT0)
  const { first } = subdivideQuadratic(second[0], second[1], second[2], localT)
  return { p0: first[0], p1: first[1], p2: first[2] }
}

type FlowInternalNode = InternalNode<Node> | NodeGeometry | null | undefined

export function findExitParam(
  node: FlowInternalNode,
  getter: (t: number) => Point,
  iterations = 20
): number {
  if (!node) return 0
  let low = 0
  let high = 1
  for (let i = 0; i < iterations; i++) {
    const mid = (low + high) / 2
    const point = getter(mid)
    if (pointInNode(point, node)) {
      low = mid
    } else {
      high = mid
    }
  }
  return high
}

export function shiftPointAlong(a: Point, b: Point, distance: number): Point {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const scale = distance / len
  return {
    x: a.x + dx * scale,
    y: a.y + dy * scale,
  }
}
