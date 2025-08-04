import type { Link } from "./link"
import type { Note } from "./note"


/**
 * Interface for a graph in the board.
 */
export interface Graph {
  id?: number
  uid: string
  type: "graph"
  label?: string
  nodes?: Note[]
  edges?: Link[]
  readonly: boolean
  createdAt: string
  updatedAt?: string
  deletedAt?: string
}


/**
 * Function to create a default graph.
 * @param uid - The unique identifier for the graph.
 * @returns A new graph with default properties.
 */
export const createDefaultGraph = (uid: string): Graph => ({
  uid,
  type: "graph",
  nodes: [],
  edges: [],
  readonly: false,
  createdAt: new Date().toISOString()
})