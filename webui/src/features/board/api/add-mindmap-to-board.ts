import { useMindMapStore } from "@/features/agent/store/mindmap-store"
import { useAppStore } from "@/store"
import { useMutation } from "@tanstack/react-query"
import { useGraphStore } from "../store/graph-store"
import { displaceNodes } from "../utils/flow-view"
import { addNotes } from "./add-notes"
import { convertEdgeToLink, convertNodeToNote } from "../utils/graph"
import { addLinks } from "./add-links"


export const useAddMindMapToBoard = () => {
  const { userId } = useAppStore()
  const { boardId, setNodes, setEdges, nodes, edges } = useGraphStore()
  const { mindmaps, clearMindMap } = useMindMapStore()

  const mutation = useMutation({
    mutationFn: async (): Promise<boolean> => {
      if (!boardId || !userId) {
        return false
      }
      const boardMindmaps = mindmaps.get(boardId) || []
      let nodes_ = [...nodes]
      let edges_ = [...edges]

      for (const mindMap of boardMindmaps) {
        const { nodes: mindMapNodes, edges: mindMapEdges } = mindMap

        // Displace mind map nodes to avoid overlap with existing nodes
        const displacedMindMapNodes = displaceNodes(nodes_, mindMapNodes)
        // Update the main graph with the displaced mind map nodes and edges
        nodes_ = [...displacedMindMapNodes, ...nodes_]
        edges_ = [...mindMapEdges, ...edges_]

        setNodes(nodes_)
        setEdges(edges_)

        await addNotes(boardId, userId, displacedMindMapNodes.map(node => convertNodeToNote(boardId, node)))
        await addLinks(boardId, userId, mindMapEdges.map(edge => convertEdgeToLink(boardId, edge)))
      }
      clearMindMap(boardId)
      return true
    }
  })

  return {
    addMindMapToBoard: mutation.mutate,
    addMindMapToBoardAsync: mutation.mutateAsync,
    ...mutation
  }
}