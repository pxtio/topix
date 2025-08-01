
import {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlow,
  BackgroundVariant,
  type ReactFlowInstance,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/base.css'
import NodeView from './node-view'
import { ActionPanel } from './action-panel'
import { createDefaultNote } from '../types/note'
import { useBoardStore } from '../store/board-store'
import { convertNoteToNode } from '../utils/graph'
import { useCallback } from 'react'
import { type LinkEdge, type NoteNode } from '../types/flow'


const proOptions = { hideAttribution: true }

const nodeTypes = {
  default: NodeView
}


export default function GraphEditor() {
  const currentBoardId = useBoardStore((state) => state.currentBoardId)

  const [nodes, setNodes, onNodesChange] = useNodesState<NoteNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<LinkEdge>([])

  const { getViewport } = useReactFlow()

  const handleAddNode = useCallback(() => {
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

  if (!currentBoardId) {
    return null
  }

  return (
    <>
      <ActionPanel onAddNode={handleAddNode} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        proOptions={proOptions}
        nodeTypes={nodeTypes}
        fitView

      >
        <MiniMap />
        <Controls />
        <Background variant={BackgroundVariant.Dots} />
      </ReactFlow>
    </>
  )
}