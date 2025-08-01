import { useReactFlow } from "@xyflow/react"
import { createDefaultNote } from "../types/note"
import { convertNoteToNode } from "../utils/graph"
import { useCallback } from "react"
import type { NoteNode } from "../types/flow"


/**
 * Custom hook to add a new note node to the graph.
 */
export function useAddNoteNode(currentBoardId: string | undefined, setNodes: (updater: (nds: NoteNode[]) => NoteNode[]) => void) {
  const { getViewport } = useReactFlow()

  return useCallback(() => {
    if (!currentBoardId) return
    const newNote = createDefaultNote(currentBoardId)
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
    if (!newNote.properties.nodePosition) {
      newNote.properties.nodePosition = { prop: { position: { x: 0, y: 0 }, type: 'position' } }
    }
    newNote.properties.nodePosition.prop.position = { x: graphX, y: graphY }
    const newNode = convertNoteToNode(newNote)
    setNodes((nds) => [...nds, newNode])
  }, [setNodes, currentBoardId, getViewport])
}