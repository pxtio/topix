import { type Node } from '@xyflow/react'
import type { NoteNode } from '../types/flow'


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


/**
 * Displaces a group of nodes vertically below another group.
 */
export function displaceNodes(
  group1: NoteNode[],
  group2: NoteNode[],
  anchorNodes?: NoteNode[],
): NoteNode[] {
  const { minY: minY1, centerX: centerX1 } = getBounds(group1)
  const { maxY: maxY2, centerX: centerX2, minX: minX2, minY: minY2 } = getBounds(group2)

  let deltaY = minY1 - maxY2 - 300 // Add some space between the groups
  let deltaX = centerX1 - centerX2

  if (anchorNodes && anchorNodes.length > 0) {
    const { minY: anchorMinY, maxX: anchorMaxX } = getBounds(anchorNodes)
    const anchorIds = new Set(anchorNodes.map(n => n.id))
    const group1IsAnchor = group1.length > 0 && group1.every(n => anchorIds.has(n.id))

    deltaX = anchorMaxX + 300 - minX2
    if (group1IsAnchor) {
      // First placement: align tops with the anchor context
      deltaY = anchorMinY - minY2
    } else {
      // Subsequent placements: stack below the previous mindmap
      const { maxY: maxY1 } = getBounds(group1)
      deltaY = maxY1 + 300 - minY2
    }
  }

  const displacedGroup2 = group2.map(node => ({
    ...node,
    position: {
      x: node.position.x + deltaX,
      y: node.position.y + deltaY
    },
    data: {
      ...node.data,
      properties: {
        ...node.data.properties,
        nodePosition: {
          position: {
            x: node.position.x + deltaX,
            y: node.position.y + deltaY
          },
          type: "position"
        }
      }
    }
  } as NoteNode))

  return displacedGroup2
}
