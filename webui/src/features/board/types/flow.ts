import type { Document } from "./document"
import type { Link } from "./link"
import type { Note } from "./note"
import type { PositionProperty } from "@/features/newsfeed/types/properties"
import { type Edge, type Node } from "@xyflow/react"

type NoteNodeData = (Note | Document) & {
  lineStart?: PositionProperty
  lineEnd?: PositionProperty
  kind?: "point"
  endpointActive?: boolean
  attachedToNodeId?: string
  attachedDirection?: { x: number; y: number }
  autoEdit?: boolean
}

export type NoteNode = Node<NoteNodeData>

export type LinkEdge = Edge<Link>
