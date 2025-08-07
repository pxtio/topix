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
    mutationFn: async () => {
      if (!boardId || !userId) {
        return
      }
      const mindMap = mindmaps.get(boardId)
      if (!mindMap) {
        return
      }
      const { nodes: mindMapNodes, edges: mindMapEdges } = mindMap

      const displacedMindMapNodes = displaceNodes(nodes, mindMapNodes)
      clearMindMap(boardId)

      // Update the main graph with the displaced mind map nodes and edges
      setNodes([...displacedMindMapNodes, ...nodes])
      setEdges([...mindMapEdges, ...edges])

      await addNotes(boardId, userId, displacedMindMapNodes.map(node => convertNodeToNote(boardId, node)))
      await addLinks(boardId, userId, mindMapEdges.map(edge => convertEdgeToLink(boardId, edge)))
    }
  })

  return {
    addMindMapToBoard: mutation.mutate,
    ...mutation
  }
}