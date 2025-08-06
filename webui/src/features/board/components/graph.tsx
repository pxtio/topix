
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  BackgroundVariant,
  MarkerType,
  type OnNodesDelete,
  type OnEdgesDelete,
  type OnConnect
} from '@xyflow/react'
import '@xyflow/react/dist/base.css'
import NodeView from './node-view'
import { ActionPanel } from './action-panel'
import { useAddNoteNode } from '../hooks/add-node'
import { EdgeView } from './edge-view'
import { CustomConnectionLine } from './connection'
import { useGraphStore } from '../store/graph-store'
import { useCallback } from 'react'
import type { LinkEdge, NoteNode } from '../types/flow'
import { useRemoveNote } from '../api/remove-note'
import { useAppStore } from '@/store'
import { useRemoveLink } from '../api/remove-link'
import { useAddLinks } from '../api/add-links'
import { convertEdgeToLink } from '../utils/graph'


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
  const userId = useAppStore((state) => state.userId)
  const {
    boardId,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onNodesDelete,
    onEdgesDelete,
    onConnect
  } = useGraphStore()

  const { removeNote } = useRemoveNote()
  const { removeLink } = useRemoveLink()
  const { addLinks } = useAddLinks()

  const deleteNodes: OnNodesDelete<NoteNode> = useCallback((nodes) => {
    if (!boardId || !userId) return
    onNodesDelete(nodes)

    // debounce the removal of notes in the backend
    nodes.forEach((node) => {
      removeNote({
        boardId,
        userId,
        noteId: node.id
      })
    })
  }, [onNodesDelete, boardId, userId, removeNote])

  const deleteEdges: OnEdgesDelete<LinkEdge> = useCallback((edges) => {
    if (!boardId || !userId) return
    onEdgesDelete(edges)

    // debounce the removal of links in the backend
    edges.forEach((edge) => {
      removeLink({
        boardId,
        userId,
        linkId: edge.id
      })
    })
  }, [onEdgesDelete, boardId, userId, removeLink])

  const connectNodes: OnConnect = useCallback((params) => {
    if (!boardId || !userId) return
    const newEdge = onConnect(params)
    if (!newEdge) return
    addLinks({
      boardId,
      userId,
      links: [convertEdgeToLink(boardId, newEdge)]
    })
  }, [onConnect, boardId, userId, addLinks])


  const handleAddNode = useAddNoteNode()

  return (
    <>
      <ActionPanel onAddNode={handleAddNode} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodesDelete={deleteNodes}
        onEdgesDelete={deleteEdges}
        proOptions={proOptions}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onConnect={connectNodes}
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