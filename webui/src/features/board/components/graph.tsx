
import {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlow,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
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


  const handleAddNode = useCallback(() => {
    if (!currentBoardId) return
    const newNote = createDefaultNote(currentBoardId)
    const newNode = convertNoteToNode(newNote)
    setNodes((nds) => [...nds, newNode])
  }, [setNodes, currentBoardId])

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