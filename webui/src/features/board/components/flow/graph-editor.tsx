import {
  MiniMap,
  ReactFlow,
  MarkerType,
  type OnConnect,
  useReactFlow,
  SelectionMode,
  useOnViewportChange,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/base.css'
import NodeView from './node-view'
import { useAddNoteNode } from '../../hooks/add-node'
import { EdgeView } from './edge-view'
import { CustomConnectionLine } from './connection'
import { useGraphStore } from '../../store/graph-store'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { LinkEdge, NoteNode } from '../../types/flow'
import { useAppStore } from '@/store'
import { useAddLinks } from '../../api/add-links'
import { convertEdgeToLink } from '../../utils/graph'
import { useAddMindMapToBoard } from '../../api/add-mindmap-to-board'
import { useMindMapStore } from '@/features/agent/store/mindmap-store'
import './graph-styles.css'
import { GraphSidebar } from '../style-panel/panel'
import { saveThumbnail } from '../../api/save-thumbnail'
import { useShallow } from 'zustand/shallow'
import { ActionPanel } from './action-panel'
import { LinearView } from './linear-view'
import { useCopyPasteNodes } from '../../hooks/copy-paste'
import { useStyleDefaults } from '../../style-provider'
import { useNodeChanges } from '../../hooks/node-changes'
import { useEdgeChanges } from '../../hooks/edge-changes'
import { useDeleteNodes } from '../../hooks/delete-nodes'
import { useDeleteEdges } from '../../hooks/delete-edges'
import { useSaveThumbnailOnUnmount } from '../../hooks/make-thumbnail'

const proOptions = { hideAttribution: true }

const nodeTypes = { default: NodeView }
const edgeTypes = { default: EdgeView }

const defaultEdgeOptions = {
  type: 'default',
  style: { stroke: '#78716c', strokeWidth: 2 },
  markerEnd: {
    type: MarkerType.Arrow,
    color: '#78716c',
    width: 20,
    height: 20
  }
}
const connectionLineStyle = { stroke: '#a8a29e' }

type ViewMode = 'graph' | 'linear' | 'grid'

export default function GraphEditor() {
  const [viewMode, setViewMode] = useState<ViewMode>('graph')

  const [enableSelection, setEnableSelection] = useState<boolean>(false)
  const [shouldRecenter, setShouldRecenter] = useState<boolean>(false)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [isLocked, setIsLocked] = useState<boolean>(false)
  const [moving, setMoving] = useState<boolean>(false)
  const [isSelecting, setIsSelecting] = useState<boolean>(false)

  const {
    zoomIn,
    zoomOut,
    fitView,
    viewportInitialized,
    setNodes: rfSetNodes
  } = useReactFlow()

  const userId = useAppStore(state => state.userId)
  const boardId = useGraphStore(state => state.boardId)
  const nodes = useGraphStore(useShallow(state => state.nodes))
  const edges = useGraphStore(useShallow(state => state.edges))
  const onConnect = useGraphStore(state => state.onConnect)
  const mindmaps = useMindMapStore(state => state.mindmaps)
  const isResizingNode = useGraphStore(state => state.isResizingNode)
  const graphViewports = useGraphStore(state => state.graphViewports)
  const setGraphViewport = useGraphStore(state => state.setGraphViewport)

  const { addLinks } = useAddLinks()
  const { addMindMapToBoardAsync } = useAddMindMapToBoard()

  const { applyDefaultLinkStyle } = useStyleDefaults()

  useCopyPasteNodes({
    jitterMax: 40,
    shortcuts: true
  })

  const deleteNodes = useDeleteNodes()

  const deleteEdges = useDeleteEdges()

  const connectNodes: OnConnect = useCallback((params) => {
    if (!boardId || !userId) return
    const style = applyDefaultLinkStyle()
    const newEdge = onConnect(params, style)
    if (!newEdge) return
    const link = convertEdgeToLink(boardId, newEdge)
    addLinks({
      boardId,
      userId,
      links: [link]
    })
  }, [onConnect, boardId, userId, addLinks, applyDefaultLinkStyle])

  const handleAddNode = useAddNoteNode()

  const rfInstanceRef = useRef<ReactFlowInstance<NoteNode, LinkEdge> | null>(null)

  useEffect(() => {
    const integrateMindmap = async () => {
      if (boardId && mindmaps.has(boardId)) {
        await addMindMapToBoardAsync()
      }
    }
    integrateMindmap()
  }, [boardId, mindmaps, addMindMapToBoardAsync])

  useEffect(() => {
    if (!shouldRecenter || viewMode !== 'graph') return
    fitView({ padding: 0.2, minZoom: 1, maxZoom: 1 })
    setShouldRecenter(false)
  }, [shouldRecenter, fitView, viewMode])

  useEffect(() => {
    if (!viewportInitialized) return
    if (!boardId || !graphViewports[boardId]) {
      fitView({ padding: 0.2, maxZoom: 1 })
    }
  }, [viewportInitialized, fitView, boardId, graphViewports])

  const { setContainerRef } = useSaveThumbnailOnUnmount({
    boardId,
    userId,
    saveThumbnail: async ({ userId, boardId, blob }) => {
      await saveThumbnail({ userId, boardId, blob })
    },
    width: 360,
    height: 200
  })

  const handleZoomIn = useCallback(() => zoomIn({ duration: 200 }), [zoomIn])
  const handleZoomOut = useCallback(() => zoomOut({ duration: 200 }), [zoomOut])
  const handleFitView = useCallback(() => fitView({ padding: 0.2, duration: 250 }), [fitView])

  const onNodeChanges = useNodeChanges()

  const onEdgeChanges = useEdgeChanges()

  const handleDragStart = useCallback(() => setIsDragging(true), [])
  const handleDragStop = useCallback(() => setIsDragging(false), [])
  const handleSelectionStart = useCallback(() => setIsSelecting(true), [])
  const handleSelectionDragStart = useCallback(() => setIsSelecting(true), [])
  const handleSelectionEnd = useCallback(() => setIsSelecting(false), [])
  const handleSelectionDragStop = useCallback(() => setIsSelecting(false), [])

  useOnViewportChange({
    onChange: () => setMoving(true),
    onEnd: (vp) => {
      if (boardId) {
        setGraphViewport(boardId, vp)
      }
      setMoving(false)
    }
  })

  // --- NEW: frontend-only expiration for data.isNew (centralized)
  const newTimersRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    // schedule timers for nodes that are marked isNew and don't already have one
    nodes.forEach(n => {
      const isNew = !!n.data?.isNew
      const hasTimer = newTimersRef.current.has(n.id)
      if (isNew && !hasTimer) {
        const t = window.setTimeout(() => {
          rfSetNodes(ns =>
            ns.map(m => m.id === n.id ? { ...m, data: { ...m.data, isNew: false } } : m)
          )
          newTimersRef.current.delete(n.id)
        }, 5000)
        newTimersRef.current.set(n.id, t)
      }
    })

    // clear timers for nodes no longer needing them (removed or isNew flipped)
    for (const [id, t] of newTimersRef.current) {
      const stillNew = nodes.some(n => n.id === id && n.data?.isNew)
      if (!stillNew) {
        clearTimeout(t)
        newTimersRef.current.delete(id)
      }
    }
  }, [nodes, rfSetNodes])

  // clear all timers on unmount
  useEffect(() => {
    const timers = newTimersRef.current
    return () => {
      for (const [, t] of timers) clearTimeout(t)
      timers.clear()
    }
  }, [])

  return (
    <div ref={setContainerRef} className='w-full h-full'>
      <ActionPanel
        onAddNode={handleAddNode}
        enableSelection={enableSelection}
        setEnableSelection={setEnableSelection}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        isLocked={isLocked}
        toggleLock={() => setIsLocked(v => !v)}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Graph-only sidebar (style controls) */}
      {viewMode === 'graph' && !isDragging && !moving && !isResizingNode && !isSelecting && (
        <div className='absolute top-16 left-1 w-auto max-w-[300px] h-auto z-50'>
          <GraphSidebar />
        </div>
      )}

      {viewMode === 'graph' ? (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodeChanges}
          onEdgesChange={onEdgeChanges}
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
          onSelectionStart={handleSelectionStart}
          onSelectionEnd={handleSelectionEnd}
          onSelectionDragStart={handleSelectionDragStart}
          onSelectionDragStop={handleSelectionDragStop}
          nodesDraggable={!isLocked}
          nodesConnectable={!isLocked}
          elementsSelectable={!isLocked}
          zoomOnScroll={!isLocked}
          zoomOnPinch={!isLocked}
          panOnScroll={!isLocked}
          onlyRenderVisibleElements
          onInit={(instance) => {
            rfInstanceRef.current = instance
            if (boardId) {
              const saved = graphViewports[boardId]
              if (saved) {
                // restore immediately, no animation
                instance.setViewport(saved, { duration: 0 })
              }
            }
          }}
        >
          {!moving && !isDragging && !isResizingNode && !isSelecting && (
            <MiniMap className='!bg-card rounded-lg'/>
          )}
        </ReactFlow>
      ) : viewMode === 'linear' ? (
        <LinearView cols={1} />
      ) : (
        <LinearView cols={3} />
      )}
    </div>
  )
}