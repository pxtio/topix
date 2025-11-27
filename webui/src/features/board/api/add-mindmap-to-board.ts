import { useMindMapStore } from '@/features/agent/store/mindmap-store'
import { useAppStore } from '@/store'
import { useMutation } from '@tanstack/react-query'
import { useGraphStore } from '../store/graph-store'
import { displaceNodes } from '../utils/flow-view'
import { useFitNodes } from '../hooks/fit-nodes'
import { useShallow } from 'zustand/react/shallow'

/**
 * A hook to add all mind map nodes/edges from the mind map store
 * into the current board, displacing to avoid overlap,
 * marking nodes as new (frontend only), fitting the view,
 * and persisting to the backend.
 */
export const useAddMindMapToBoard = () => {
  const { userId } = useAppStore()
  const boardId = useGraphStore(state => state.boardId)
  const nodes = useGraphStore(useShallow(state => state.nodes))
  const edges = useGraphStore(useShallow(state => state.edges))
  const setNodesPersist = useGraphStore(state => state.setNodesPersist)
  const setEdgesPersist = useGraphStore(state => state.setEdgesPersist)
  const { mindmaps, clearMindMap } = useMindMapStore()
  const fitNodes = useFitNodes()

  const mutation = useMutation({
    mutationFn: async (): Promise<boolean> => {
      if (!boardId || !userId) {
        return false
      }

      const boardMindmaps = mindmaps.get(boardId) || []
      let nodes_ = [...nodes]
      let edges_ = [...edges]

      const newIds: string[] = []

      for (const mindMap of boardMindmaps) {
        const { nodes: mindMapNodes, edges: mindMapEdges } = mindMap

        // mark as new (frontend only)
        mindMapNodes.forEach(n => { n.data.isNew = true })

        // avoid overlap and merge into the board
        const displacedMindMapNodes = displaceNodes(nodes_, mindMapNodes)
        nodes_ = [...displacedMindMapNodes, ...nodes_]
        edges_ = [...mindMapEdges, ...edges_]

        // update stores (drives React Flow)
        setNodesPersist(nodes_)
        setEdgesPersist(edges_)

        // fit the camera to just-added nodes (waits until measured)
        displacedMindMapNodes.forEach(n => newIds.push(n.id))
      }

      // fit view to new nodes
      if (newIds.length > 0) {
        await fitNodes(newIds, { padding: 0.25, duration: 100 })
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