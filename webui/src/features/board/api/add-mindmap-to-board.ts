import { useMindMapStore } from '@/features/agent/store/mindmap-store'
import { useAppStore } from '@/store'
import { useMutation } from '@tanstack/react-query'
import { useGraphStore } from '../store/graph-store'
import { displaceNodes } from '../utils/flow-view'
import { nodeCenter } from '../utils/point-attach'
import { POINT_NODE_SIZE } from '../components/flow/point-node'
import { generateUuid } from '@/lib/common'
import type { LinkEdge, NoteNode } from '../types/flow'
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
        const displacedById = new Map(displacedMindMapNodes.map(node => [node.id, node]))
        const newPointNodes: NoteNode[] = []
        const convertedEdges: LinkEdge[] = []

        const attachPointPair = (edge: LinkEdge) => {
          const sourceNode = displacedById.get(edge.source)
          const targetNode = displacedById.get(edge.target)
          if (!sourceNode || !targetNode) {
            convertedEdges.push(edge)
            return
          }

          const edgeId = edge.id || generateUuid()
          const startId = `${edgeId}-start`
          const endId = `${edgeId}-end`
          const offset = POINT_NODE_SIZE / 2
          const sourceCenter = nodeCenter(sourceNode)
          const targetCenter = nodeCenter(targetNode)

          const startPoint: NoteNode = {
            id: startId,
            type: 'point',
            position: {
              x: sourceCenter.x - offset,
              y: sourceCenter.y - offset,
            },
            data: {
              kind: 'point',
              attachedToNodeId: sourceNode.id,
              attachedDirection: { x: 0, y: 0 },
            } as NoteNode['data'],
            draggable: true,
            selectable: true,
          }

          const endPoint: NoteNode = {
            id: endId,
            type: 'point',
            position: {
              x: targetCenter.x - offset,
              y: targetCenter.y - offset,
            },
            data: {
              kind: 'point',
              attachedToNodeId: targetNode.id,
              attachedDirection: { x: 0, y: 0 },
            } as NoteNode['data'],
            draggable: true,
            selectable: true,
          }

          newPointNodes.push(startPoint, endPoint)

          convertedEdges.push({
            ...edge,
            id: edgeId,
            source: startId,
            target: endId,
            sourceHandle: 'point',
            targetHandle: 'point',
          })
        }
        mindMapEdges.forEach(attachPointPair)
        nodes_ = [...displacedMindMapNodes, ...newPointNodes, ...nodes_]
        edges_ = [...convertedEdges, ...edges_]

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
