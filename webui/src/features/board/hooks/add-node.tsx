import { useReactFlow } from "@xyflow/react"
import { createDefaultNote, createDefaultNoteProperties } from "../types/note"
import { useCallback } from "react"
import { useGraphStore } from "../store/graph-store"
import { convertNoteToNode } from "../utils/graph"
import type { NodeType } from "../types/style"
import { useStyleDefaults } from "../style-provider"
import { useShallow } from "zustand/react/shallow"


/**
 * Custom hook to add a new note node to the graph.
 */
export type CanvasPoint = { x: number; y: number }
export type CanvasSize = { width: number; height: number }

export type AddNoteNodeOptions = {
  nodeType?: NodeType
  imageUrl?: string
  icon?: string
  position?: CanvasPoint
  size?: CanvasSize
}

export function useAddNoteNode() {
  const { getViewport } = useReactFlow()

  const boardId = useGraphStore(state => state.boardId)
  const setNodesPersist = useGraphStore(state => state.setNodesPersist)
  const nodes = useGraphStore(useShallow(state => state.nodes))

  const { applyDefaultNodeStyle } = useStyleDefaults()

  return useCallback(({
    nodeType = 'rectangle',
    imageUrl,
    icon,
    position,
    size
  }: AddNoteNodeOptions) => {
    if (!boardId) return

    const newNote = createDefaultNote({ boardId, nodeType })
    newNote.style = applyDefaultNodeStyle(nodeType)

    if (imageUrl) {
      newNote.properties.imageUrl = { type: 'image', image: { url: imageUrl } }
    }
    if (icon) {
      newNote.properties.iconData = { type: 'icon', icon: { type: 'icon', icon } }
    }
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

    const finalPosition = position ?? { x: graphX, y: graphY }
    newNote.properties.nodePosition = { position: finalPosition, type: 'position' }

    if (size) {
      newNote.properties.nodeSize = { size, type: 'size' }
    }
    const node = convertNoteToNode(newNote)
    const newNodes = nodes.map(n => ({ ...n, selected: false }))
    node.selected = true
    setNodesPersist([...newNodes, node])
  }, [boardId, getViewport, setNodesPersist, nodes, applyDefaultNodeStyle])
}
