import { dagreLayout } from "./dagre"
import { getSourceHandlePosition, getTargetHandlePosition, type LayoutAlgorithmOptions } from "./settings"
import type { LinkEdge, NoteNode } from "../../types/flow"


/**
 * Automatically arranges nodes and edges in a graph layout.
 */
export async function autoLayout(
  nodes: NoteNode[],
  edges: LinkEdge[],
  options: LayoutAlgorithmOptions
): Promise<{ nodes: NoteNode[], edges: LinkEdge[] }> {
  const nodeCopies = nodes.map(node => ({...node}))
  const edgeCopies = edges.map(edge => ({...edge}))

  const { nodes: nextNodes, edges: nextEdges } = await dagreLayout(
    nodeCopies,
    edgeCopies,
    options
  )

  for (const node of nextNodes) {
    node.style = { ...node.style, opacity: 1 }
    node.sourcePosition = getSourceHandlePosition(options.direction)
    node.targetPosition = getTargetHandlePosition(options.direction)
  }

  return { nodes: nextNodes, edges: nextEdges }
}