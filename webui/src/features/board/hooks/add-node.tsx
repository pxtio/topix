import { useReactFlow } from "@xyflow/react"
import { createDefaultNote } from "../types/note"
import { useCallback } from "react"
import { useGraphStore } from "../store/graph-store"
import { convertNoteToNode } from "../utils/graph"


/**
 * Custom hook to add a new note node to the graph.
 */
export function useAddNoteNode() {
  const { getViewport } = useReactFlow()

  const { boardId, nodes, setNodes } = useGraphStore()

  return useCallback(() => {
    if (!boardId) return
    console.log("Adding new note node to board:", boardId)
    const newNote = createDefaultNote(boardId)
    const jitter = () => Math.random() * 100 - 50

    const container = document.querySelector('.react-flow__viewport')?.getBoundingClientRect()
    const cw = container?.width ?? 800
    const ch = container?.height ?? 600

    const screenX = cw / 3 + jitter()
    const screenY = ch / 3 + jitter()

    const { x: vx, y: vy, zoom } = getViewport()

    const graphX = (screenX - vx) / zoom
    const graphY = (screenY - vy) / zoom

    if (!newNote.properties) {
      newNote.properties = {}
    }
    newNote.properties.nodePosition = { prop: { position: { x: graphX, y: graphY }, type: 'position' } }
    setNodes([...nodes, convertNoteToNode(newNote)])
  }, [boardId, getViewport, setNodes, nodes])
}