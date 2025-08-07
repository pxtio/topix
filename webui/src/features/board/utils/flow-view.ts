import { type Node } from '@xyflow/react'


/**
 * Interface representing the bounds of a set of nodes.
 */
interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  centerX: number
  centerY: number
}

/**
 * Calculates the bounding box and centroid of a set of nodes.
 *
 * @param nodes - Array of nodes to calculate bounds for.
 * @returns An object containing the minX, minY, maxX, maxY, centerX, and centerY.
 */
export function getBounds(nodes: Node[]): Bounds {
  if (!nodes.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, centerX: 0, centerY: 0 }

  const minX = Math.min(...nodes.map(n => n.position.x))
  const maxX = Math.max(...nodes.map(n => n.position.x + (n.measured?.width ?? 0)))
  const minY = Math.min(...nodes.map(n => n.position.y))
  const maxY = Math.max(...nodes.map(n => n.position.y + (n.measured?.height ?? 0)))

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  return { minX, minY, maxX, maxY, centerX, centerY }
}