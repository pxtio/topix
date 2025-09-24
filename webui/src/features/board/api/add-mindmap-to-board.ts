import { useMindMapStore } from '@/features/agent/store/mindmap-store'
import { useAppStore } from '@/store'
import { useMutation } from '@tanstack/react-query'
import { useGraphStore } from '../store/graph-store'
import { displaceNodes } from '../utils/flow-view'
import { addNotes } from './add-notes'
import { convertEdgeToLink, convertNodeToNote } from '../utils/graph'
import { addLinks } from './add-links'
import { useFitNodes } from '../hooks/fit-nodes'
import type { Note } from '../types/note'
import type { Link } from '../types/link'

/**
 * A hook to add all mind map nodes/edges from the mind map store
 * into the current board, displacing to avoid overlap,
 * marking nodes as new (frontend only), fitting the view,
 * and persisting to the backend.
 */
export const useAddMindMapToBoard = () => {
  const { userId } = useAppStore()
  const { boardId, setNodes, setEdges, nodes, edges } = useGraphStore()
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
      const addedNotes: Note[] = []
      const addedLinks: Link[] = []

      for (const mindMap of boardMindmaps) {
        const { nodes: mindMapNodes, edges: mindMapEdges } = mindMap

        // mark as new (frontend only)
        mindMapNodes.forEach(n => { n.data.isNew = true })

        // avoid overlap and merge into the board
        const displacedMindMapNodes = displaceNodes(nodes_, mindMapNodes)
        nodes_ = [...displacedMindMapNodes, ...nodes_]
        edges_ = [...mindMapEdges, ...edges_]

        // update stores (drives React Flow)
        setNodes(nodes_)
        setEdges(edges_)

        // fit the camera to just-added nodes (waits until measured)
        displacedMindMapNodes.forEach(n => newIds.push(n.id))

        const newNotes = displacedMindMapNodes.map(node => convertNodeToNote(boardId, node))
        const newLinks = mindMapEdges.map(edge => convertEdgeToLink(boardId, edge))
        addedNotes.push(...newNotes)
        addedLinks.push(...newLinks)
      }

      // fit view to new nodes
      if (newIds.length > 0) {
        await fitNodes(newIds, { padding: 0.25, duration: 100 })
      }
      // backend persistence
      if (addedNotes.length > 0) {
        await addNotes(
          boardId,
          userId,
          addedNotes
        )
      }
      if (addedLinks.length > 0) {
        await addLinks(
          boardId,
          userId,
          addedLinks
        )
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