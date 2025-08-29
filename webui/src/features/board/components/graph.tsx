
import {
  MiniMap,
  ReactFlow,
  MarkerType,
  type OnNodesDelete,
  type OnEdgesDelete,
  type OnConnect,
  useReactFlow,
  SelectionMode,
  type NodeChange,
  type EdgeChange,
  useOnViewportChange
} from '@xyflow/react'
import '@xyflow/react/dist/base.css'
import NodeView from './node-view'
import { ActionPanel } from './action-panel'
import { useAddNoteNode } from '../hooks/add-node'
import { EdgeView } from './edge-view'
import { CustomConnectionLine } from './connection'
import { useGraphStore } from '../store/graph-store'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LinkEdge, NoteNode } from '../types/flow'
import { useRemoveNote } from '../api/remove-note'
import { useAppStore } from '@/store'
import { useRemoveLink } from '../api/remove-link'
import { useAddLinks } from '../api/add-links'
import { convertEdgeToLink } from '../utils/graph'
import { useAddMindMapToBoard } from '../api/add-mindmap-to-board'
import { useMindMapStore } from '@/features/agent/store/mindmap-store'
import './graph-styles.css'
import { GraphSidebar } from './style-panel/panel'
import { useSaveThumbnailOnUnmount } from '../hooks/make-thumbnail'
import { saveThumbnail } from '../api/save-thumbnail'
import { useShallow } from 'zustand/shallow'


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
  const [isLocked, setIsLocked] = useState<boolean>(false)
  const [moving, setMoving] = useState<boolean>(false)

  const { zoomIn, zoomOut, fitView, setViewport } = useReactFlow()

  const userId = useAppStore((state) => state.userId)
  const boardId = useGraphStore((state) => state.boardId)
  const isLoading = useGraphStore((state) => state.isLoading)
  const nodes = useGraphStore(useShallow((state) => state.nodes))
  const edges = useGraphStore(useShallow((state) => state.edges))
  const onNodesChange = useGraphStore((state) => state.onNodesChange)
  const onEdgesChange = useGraphStore((state) => state.onEdgesChange)
  const onNodesDelete = useGraphStore((state) => state.onNodesDelete)
  const onEdgesDelete = useGraphStore((state) => state.onEdgesDelete)
  const onConnect = useGraphStore((state) => state.onConnect)
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
    fitView({ padding: 0.2, duration: 250, minZoom: 1, maxZoom: 1 })
    setShouldRecenter(false)
  }, [setViewport, shouldRecenter, fitView])

  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useSaveThumbnailOnUnmount({
    boardId,
    containerRef: wrapperRef,
    saveThumbnail: async (boardId, blob) => {
      await saveThumbnail({ userId, boardId, blob })
    },
    opts: { width: 360, height: 200, pixelRatio: 1, backgroundColor: 'transparent' },
  })

  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 200 })
  }, [zoomIn])

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 200 })
  }, [zoomOut])

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 250 })
  }, [fitView])

  const throttledOnNodesChange = useMemo(() => {
    let raf: number | null = null
    let queued: NodeChange<NoteNode>[] | null = null

    return (changes: NodeChange<NoteNode>[]) => {
      queued = queued ? [...queued, ...changes] : changes
      if (raf) return
      raf = requestAnimationFrame(() => {
        onNodesChange(queued!)
        raf = null
        queued = null
      })
    }
  }, [onNodesChange])

  const throttledOnEdgesChange = useMemo(() => {
    let raf: number | null = null
    let queued: EdgeChange<LinkEdge>[] | null = null

    return (changes: EdgeChange<LinkEdge>[]) => {
      queued = queued ? [...queued, ...changes] : changes
      if (raf) return
      raf = requestAnimationFrame(() => {
        onEdgesChange(queued!)
        raf = null
        queued = null
      })
    }
  }, [onEdgesChange])

  const handleDragStart = useCallback(() => setIsDragging(true), [])
  const handleDragStop = useCallback(() => setIsDragging(false), [])


  useOnViewportChange({
    onChange: () => setMoving(true),
    onEnd: () => setMoving(false)
  })

  return (
    <div ref={wrapperRef} className='w-full h-full'>
      <ActionPanel
        onAddNode={handleAddNode}
        enableSelection={enableSelection}
        setEnableSelection={setEnableSelection}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        isLocked={isLocked}
        toggleLock={() => setIsLocked((v) => !v)}
      />
      {
        !isDragging && !moving && (
          <div className='absolute top-1 left-1 w-auto max-w-[300px] h-auto z-50'>
            <GraphSidebar />
          </div>
        )
      }
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={throttledOnNodesChange}
        onEdgesChange={throttledOnEdgesChange}
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
        panOnDrag={!isLocked && !enableSelection}
        selectionKeyCode={null}
        onNodeDragStart={handleDragStart}
        onNodeDragStop={handleDragStop}
        nodesDraggable={!isLocked}
        nodesConnectable={!isLocked}
        elementsSelectable={!isLocked}
        zoomOnScroll={!isLocked}
        zoomOnPinch={!isLocked}
        panOnScroll={!isLocked}
        onlyRenderVisibleElements
      >
        {!moving && !isDragging && <MiniMap className='!bg-card rounded-lg'/>}
      </ReactFlow>
    </div>
  )
}