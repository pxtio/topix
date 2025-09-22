import { useReactFlow } from "@xyflow/react"
import { createDefaultNote, createDefaultNoteProperties, type Note } from "../types/note"
import { useCallback } from "react"
import { useGraphStore } from "../store/graph-store"
import { convertNoteToNode } from "../utils/graph"
import { useAddNotes } from "../api/add-notes"
import { useAppStore } from "@/store"
import type { NodeType } from "../types/style"
import { useStyleDefaults } from "../style-provider"


/**
 * Custom hook to add a new note node to the graph.
 */
export function useAddNoteNode() {
  const userId = useAppStore((state) => state.userId)

  const { getViewport } = useReactFlow()

  const { boardId, nodes, setNodes } = useGraphStore()

  const { addNotes } = useAddNotes()
  const { applyDefaultNodeStyle } = useStyleDefaults()

  return useCallback(({
    nodeType = 'rectangle'
  }: {
    nodeType?: NodeType
  }) => {
    if (!boardId) return
    const newNote = createDefaultNote({ boardId, nodeType })
    newNote.style = applyDefaultNodeStyle(nodeType)
    const jitter = () => Math.random() * 100 - 50

    const container = document.querySelector('.react-flow__viewport')?.getBoundingClientRect()
    const cw = container?.width ?? 800
    const ch = container?.height ?? 600

    const screenX = cw / 2 + jitter()
    const screenY = ch / 2 + jitter()

    const { x: vx, y: vy, zoom } = getViewport()

    const graphX = (screenX - vx) / zoom
    const graphY = (screenY - vy) / zoom

    if (!newNote.properties) {
      newNote.properties = createDefaultNoteProperties({ type: nodeType })
    }
    newNote.properties.nodePosition = { position: { x: graphX, y: graphY }, type: 'position' }
    const node = convertNoteToNode(newNote)
    const newNodes = nodes.map(n => ({ ...n, selected: false }))
    node.selected = true
    setNodes([...newNodes, node])
    const notes: Note[] = [newNote]
    addNotes({ boardId, userId, notes })
  }, [boardId, getViewport, setNodes, nodes, addNotes, userId, applyDefaultNodeStyle])
}