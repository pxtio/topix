import type { Graph } from "../types/board"
import camelcaseKeys from "camelcase-keys"
import { useMutation } from "@tanstack/react-query"
import { useGraphStore } from "../store/graph-store"
import { convertLinkToEdgeWithPoints, convertNoteToNode } from "../utils/graph"
import type { LinkEdge, NoteNode } from "../types/flow"
import { apiFetch } from "@/api"


/**
 * Fetch a board by its ID for the user.
 *
 * @param boardId - The ID of the board to be fetched.
 * @returns A promise that resolves to the board object.
 */
export async function getBoard(
  boardId: string,
  rootId?: string,
): Promise<{ graph: Graph; canEdit: boolean }> {
  const res = await apiFetch<{ data: Record<string, unknown> }>({
    path: `/boards/${boardId}`,
    method: "GET",
    params: { root_id: rootId },
  })
  const data = camelcaseKeys(res.data, { deep: true })
  return {
    graph: data.graph as Graph,
    canEdit: data.canEdit !== false,
  }
}


/**
 * Reload a board into the graph store, including derived point nodes and edges.
 */
export async function reloadBoardIntoStore(
  boardId: string,
  rootId?: string,
): Promise<boolean> {
  const {
    setNodes,
    setEdges,
    setBoardVisibility,
    setBoardCanEdit,
    setBoardLabel,
  } = useGraphStore.getState()

  const { graph, canEdit } = await getBoard(boardId, rootId)
  const { nodes: notes, edges: links, visibility } = graph
  const nodes = (notes ?? []).map(convertNoteToNode)
  const nodesById = new Map(nodes.map(node => [node.id, node]))
  const edges: LinkEdge[] = []
  const pointNodes: NoteNode[] = []

  for (const link of links ?? []) {
    const { edge, points } = convertLinkToEdgeWithPoints(link, nodesById)
    edges.push(edge)
    if (points.length) {
      pointNodes.push(...points)
    }
  }

  const loadedNodes = [...nodes, ...pointNodes]
  const readonlyNodes = canEdit
    ? loadedNodes
    : loadedNodes.map(node => ({
        ...node,
        draggable: false,
        selectable: false,
      }))

  setNodes(readonlyNodes)
  setEdges(edges)
  setBoardVisibility(visibility ?? "private")
  setBoardCanEdit(canEdit)
  setBoardLabel(graph.label ?? "")
  return true
}


/**
 * Custom hook to fetch a board by its ID for the user.
 */
export const useGetBoard = () => {
  // no selectors here → no subscription
  const mutation = useMutation({
    mutationFn: async (): Promise<boolean> => {
      const {
        boardId,
        rootId,
        isLoading,
        setIsLoading,
      } = useGraphStore.getState()
      if (!boardId) return false
      if (isLoading) return false
      setIsLoading(true)
      try {
        return await reloadBoardIntoStore(boardId, rootId)
      } finally {
        setIsLoading(false)
      }
    },
  })

  return {
    getBoard: mutation.mutate,
    getBoardAsync: mutation.mutateAsync,
    ...mutation,
  }
}
