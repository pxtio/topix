import { Position } from "@xyflow/react"
import type { LinkEdge, NoteNode } from "../../types/flow"

/**
 * Direction for layout algorithms.
 */
export type Direction = 'TB' | 'LR' | 'RL' | 'BT'


/**
 * Options for layout algorithms.
 */
export type LayoutAlgorithmOptions = {
  direction: Direction
  spacing: [number, number]
}


// Default layout options for graph algorithms.
export const defaultLayoutOptions: LayoutAlgorithmOptions = {
  direction: 'LR',
  spacing: [50, 100],
}


/**
 * Input for layout algorithms.
 */
export type LayoutAlgorithm = (
  nodes: NoteNode[],
  edges: LinkEdge[],
  options: LayoutAlgorithmOptions
) => Promise<{ nodes: NoteNode[], edges: LinkEdge[] }>


/**
 * Get source handle position based on the layout direction.
 */
export function getSourceHandlePosition(direction: Direction) {
  switch (direction) {
    case 'TB':
      return Position.Bottom
    case 'BT':
      return Position.Top
    case 'LR':
      return Position.Right
    case 'RL':
      return Position.Left
  }
}

/**
 * Get target handle position based on the layout direction.
 */
export function getTargetHandlePosition(direction: Direction) {
  switch (direction) {
    case 'TB':
      return Position.Top
    case 'BT':
      return Position.Bottom
    case 'LR':
      return Position.Left
    case 'RL':
      return Position.Right
  }
}