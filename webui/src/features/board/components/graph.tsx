
import {
  Controls,
  MiniMap,
  ReactFlow,
  MarkerType,
  type OnNodesDelete,
  type OnEdgesDelete,
  type OnConnect,
  useReactFlow,
  SelectionMode
} from '@xyflow/react'
import '@xyflow/react/dist/base.css'
import NodeView from './node-view'
import { ActionPanel } from './action-panel'
import { useAddNoteNode } from '../hooks/add-node'
import { EdgeView } from './edge-view'
import { CustomConnectionLine } from './connection'
import { useGraphStore } from '../store/graph-store'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { LinkEdge, NoteNode } from '../types/flow'
import { useRemoveNote } from '../api/remove-note'
import { useAppStore } from '@/store'
import { useRemoveLink } from '../api/remove-link'
import { useAddLinks } from '../api/add-links'
import { convertEdgeToLink } from '../utils/graph'
import { getBounds } from '../utils/flow-view'
import { useAddMindMapToBoard } from '../api/add-mindmap-to-board'
import { useMindMapStore } from '@/features/agent/store/mindmap-store'
import './graph-styles.css'
import { GraphSidebar } from './style-panel/panel'
import { useSaveThumbnailOnUnmount } from '../hooks/make-thumbnail'
import { saveThumbnail } from '../api/save-thumbnail'


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
  const [enableSelection, setEnableSelection] = useState<boolean>(false)
  const [shouldRecenter, setShouldRecenter] = useState<boolean>(false)
  const [isDragging, setIsDragging] = useState<boolean>(false)

  const userId = useAppStore((state) => state.userId)
  const {
    boardId,
    isLoading,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onNodesDelete,
    onEdgesDelete,
    onConnect,
  } = useGraphStore()
  const { mindmaps } = useMindMapStore()
  const { removeNote } = useRemoveNote()
  const { removeLink } = useRemoveLink()
  const { addLinks } = useAddLinks()
  const { addMindMapToBoardAsync } = useAddMindMapToBoard()

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

  const { setViewport } = useReactFlow()

  useEffect(() => {
    if (!isLoading) {
      // once loading is done, signal recentering the view
      setShouldRecenter(true)
    }
  }, [isLoading])

  useEffect(() => {
    const integrateMindmap = async () => {
      if (boardId && mindmaps.has(boardId)) {
        const added = await addMindMapToBoardAsync()
        if (added) {
          setShouldRecenter(true)
        }
      }
    }
    integrateMindmap()
  }, [boardId, mindmaps, addMindMapToBoardAsync])


  useEffect(() => {
    // only recenter when it's signaled (after loading)
    if (!shouldRecenter) return
    if (nodes.length === 0) {
      setViewport({ x: 0, y: 0, zoom: 1 })
    } else {
      const { centerX, centerY } = getBounds(nodes)
      setViewport({
        // TODO: Use container size to adjust centering instead of window size
        x: -centerX + window.innerWidth / 2 - 200,
        y: -centerY + window.innerHeight / 2 - 100,
        zoom: 1
      })
    }
    setShouldRecenter(false)
  }, [boardId, nodes, setViewport, shouldRecenter])

  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useSaveThumbnailOnUnmount({
    boardId,
    containerRef: wrapperRef,
    saveThumbnail: async (boardId, blob) => {
      await saveThumbnail({ userId, boardId, blob })
    },
    opts: { width: 360, height: 200, pixelRatio: 1, backgroundColor: 'transparent' },
  })

  return (
    <div ref={wrapperRef} className='w-full h-full'>
      <ActionPanel
        onAddNode={handleAddNode}
        enableSelection={enableSelection}
        setEnableSelection={setEnableSelection}
      />
      {
        !isDragging && (
          <div className='absolute top-1 left-1 w-auto max-w-[300px] h-auto z-50'>
            <GraphSidebar />
          </div>
        )
      }
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
        selectionOnDrag={enableSelection}
        selectionMode={SelectionMode.Partial}
        panOnDrag={!enableSelection}
        selectionKeyCode={null}
        onNodeDragStart={() => setIsDragging(true)}
        onNodeDragStop={() => setIsDragging(false)}
      >
        <MiniMap className='!bg-card rounded-lg'/>
        <Controls />
      </ReactFlow>
    </div>
  )
}