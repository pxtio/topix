
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  BackgroundVariant,
  MarkerType
} from '@xyflow/react'
import '@xyflow/react/dist/base.css'
import NodeView from './node-view'
import { ActionPanel } from './action-panel'
import { useAddNoteNode } from '../hooks/add-node'
import { EdgeView } from './edge-view'
import { CustomConnectionLine } from './connection'
import { useGraphStore } from '../store/graph-store'


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
  const {
    nodes,
    edges,
    deletedNodes,
    deletedEdges,
    onNodesChange,
    onEdgesChange,
    onNodesDelete,
    onEdgesDelete,
    onConnect
  } = useGraphStore()

  console.log('nodes', nodes)
  console.log('edges', edges)
  console.log('deletedNodes', deletedNodes)
  console.log('deletedEdges', deletedEdges)

  const handleAddNode = useAddNoteNode()

  return (
    <>
      <ActionPanel onAddNode={handleAddNode} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        proOptions={proOptions}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onConnect={onConnect}
        defaultEdgeOptions={defaultEdgeOptions}
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