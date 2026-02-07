import camelcaseKeys from "camelcase-keys"
import { useMutation } from "@tanstack/react-query"
import { apiFetch } from "@/api"
import type { Note } from "../types/note"
import type { Link } from "../types/link"
import { convertLinkToEdgeWithPoints, convertNoteToNode } from "../utils/graph"
import type { LinkEdge, NoteNode } from "../types/flow"
import { useGraphStore } from "../store/graph-store"

type ParseDocumentResponse = {
  notes: Note[]
  links: Link[]
}

/**
 * Parse a document and return notes + links.
 */
export async function parseDocument(
  boardId: string,
  file: File,
): Promise<ParseDocumentResponse> {
  const form = new FormData()
  form.append("file", file)

  const res = await apiFetch<{ data: Record<string, unknown> }>({
    path: "/documents",
    method: "POST",
    params: { graph_id: boardId },
    body: form,
  })

  const data = camelcaseKeys(res.data, { deep: true })
  return {
    notes: (data.notes ?? []) as Note[],
    links: (data.links ?? []) as Link[],
  }
}

/**
 * Hook to parse a document and merge nodes/edges into the graph store.
 */
export const useParseDocument = () => {
  const setNodes = useGraphStore(state => state.setNodes)
  const setEdges = useGraphStore(state => state.setEdges)

  const mutation = useMutation({
    mutationFn: async ({
      boardId,
      file,
    }: {
      boardId: string
      file: File
    }): Promise<ParseDocumentResponse> => parseDocument(boardId, file),
    onSuccess: ({ notes, links }) => {
      const nodes = notes.map(convertNoteToNode)
      const nodesById = new Map(nodes.map(node => [node.id, node]))
      const edges: LinkEdge[] = []
      const pointNodes: NoteNode[] = []

      for (const link of links) {
        const { edge, points } = convertLinkToEdgeWithPoints(link, nodesById)
        edges.push(edge)
        if (points.length) {
          pointNodes.push(...points)
        }
      }

      setNodes(prev => [...nodes, ...pointNodes, ...prev])
      setEdges(prev => [...edges, ...prev])
    },
  })

  return {
    parseDocument: mutation.mutate,
    parseDocumentAsync: mutation.mutateAsync,
    ...mutation,
  }
}
