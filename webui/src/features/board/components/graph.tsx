
import {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlow,
  BackgroundVariant,
  addEdge,
  type Connection,
  MarkerType
} from '@xyflow/react'
import '@xyflow/react/dist/base.css'
import NodeView from './node-view'
import { ActionPanel } from './action-panel'
import { useBoardStore } from '../store/board-store'
import { type LinkEdge, type NoteNode } from '../types/flow'
import { useAddNoteNode } from '../hooks/add-node'
import { EdgeView } from './edge-view'
import { useCallback } from 'react'
import { CustomConnectionLine } from './connection'


const proOptions = { hideAttribution: true }

const nodeTypes = {
  default: NodeView
}

const edgeTypes = {
  default: EdgeView,
}

const defaultEdgeOptions = {
  type: 'default',
  style: { stroke: '#636363', strokeWidth: 1 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#636363',
    width: 20,
    height: 20
  },
}
const connectionLineStyle = {
  stroke: '#636363',
}


/**
 * GraphEditor component to render the graph with nodes and edges.
 */
export default function GraphEditor() {
  const currentBoardId = useBoardStore((state) => state.currentBoardId)

  const [nodes, setNodes, onNodesChange] = useNodesState<NoteNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<LinkEdge>([])

  const handleAddNode = useAddNoteNode(currentBoardId, setNodes)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  )

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
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onConnect={onConnect}
        connectionLineComponent={CustomConnectionLine}
        connectionLineStyle={connectionLineStyle}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <MiniMap />
        <Controls />
        <Background variant={BackgroundVariant.Dots} />
      </ReactFlow>
    </>
  )
}