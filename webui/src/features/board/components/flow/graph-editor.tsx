import {
  ReactFlow,
  MarkerType,
  type OnConnect,
  useReactFlow,
  SelectionMode,
  useOnViewportChange,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/base.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/shallow'

import NodeView from './node-view'
import { EdgeView } from './edge-view'
import { CustomConnectionLine } from './connection'
import { GraphSidebar } from '../style-panel/panel'
import { ActionPanel } from './action-panel'
import { DefaultBoardView } from '../default-view'

import { useGraphStore } from '../../store/graph-store'
import type { LinkEdge, NoteNode } from '../../types/flow'

import { useAddNoteNode } from '../../hooks/add-node'
import { useMindMapStore } from '@/features/agent/store/mindmap-store'
import { useAddMindMapToBoard } from '../../api/add-mindmap-to-board'
// import { saveThumbnail } from '../../api/save-thumbnail'
import { useCopyPasteNodes } from '../../hooks/copy-paste'
import { useStyleDefaults } from '../../style-provider'
// import { useSaveThumbnail } from '../../hooks/make-thumbnail'

import './graph-styles.css'

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
    height: 20,
  },
}
const connectionLineStyle = { stroke: '#a8a29e' }

type ViewMode = 'graph' | 'linear'

export default function GraphEditor() {
  const [viewMode, setViewMode] = useState<ViewMode>('linear')

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
  } = useReactFlow()

  const boardId = useGraphStore(state => state.boardId)

  const nodes = useGraphStore(useShallow(state => state.nodes))
  const edges = useGraphStore(useShallow(state => state.edges))

  const setNodes = useGraphStore(state => state.setNodes)
  const onNodesChange = useGraphStore(state => state.onNodesChange)
  const onEdgesChange = useGraphStore(state => state.onEdgesChange)
  const onNodesDelete = useGraphStore(state => state.onNodesDelete)
  const onEdgesDelete = useGraphStore(state => state.onEdgesDelete)
  const storeOnConnect = useGraphStore(state => state.onConnect)

  const isResizingNode = useGraphStore(state => state.isResizingNode)
  const graphViewports = useGraphStore(state => state.graphViewports)
  const setGraphViewport = useGraphStore(state => state.setGraphViewport)

  const mindmaps = useMindMapStore(state => state.mindmaps)
  const { addMindMapToBoardAsync } = useAddMindMapToBoard()

  const { applyDefaultLinkStyle } = useStyleDefaults()

  useCopyPasteNodes({
    jitterMax: 40,
    shortcuts: true,
  })

  const handleAddNode = useAddNoteNode()

  const rfInstanceRef = useRef<ReactFlowInstance<NoteNode, LinkEdge> | null>(null)

  // Mindmap integration (unchanged)
  useEffect(() => {
    const integrateMindmap = async () => {
      if (boardId && mindmaps.has(boardId)) {
        await addMindMapToBoardAsync()
      }
    }
    integrateMindmap()
  }, [boardId, mindmaps, addMindMapToBoardAsync])

  // Recenter when toggling view
  useEffect(() => {
    if (!shouldRecenter || viewMode !== 'graph') return
    fitView({ padding: 0.2, minZoom: 1, maxZoom: 1 })
    setShouldRecenter(false)
  }, [shouldRecenter, fitView, viewMode])

  // Initial viewport / restore saved viewport
  useEffect(() => {
    if (!viewportInitialized) return
    if (!boardId || !graphViewports[boardId]) {
      fitView({ padding: 0.2, maxZoom: 1 })
    }
  }, [viewportInitialized, fitView, boardId, graphViewports])

  const handleZoomIn = useCallback(() => zoomIn({ duration: 200 }), [zoomIn])
  const handleZoomOut = useCallback(() => zoomOut({ duration: 200 }), [zoomOut])
  const handleFitView = useCallback(
    () => fitView({ padding: 0.2, duration: 250 }),
    [fitView],
  )

  // Connect using store (store handles addLink + persistence)
  const connectNodes: OnConnect = useCallback(
    (params) => {
      if (!boardId) return
      const style = applyDefaultLinkStyle()
      storeOnConnect(params, style)
    },
    [boardId, storeOnConnect, applyDefaultLinkStyle],
  )

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
    },
  })

  // --- frontend-only expiration for data.isNew ---

  const newTimersRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    // schedule timers for nodes that are marked isNew and don't already have one
    nodes.forEach((n) => {
      const isNew = !!n.data?.isNew
      const hasTimer = newTimersRef.current.has(n.id)
      if (isNew && !hasTimer) {
        const t = window.setTimeout(() => {
          setNodes((ns) =>
            ns.map((m) =>
              m.id === n.id ? { ...m, data: { ...m.data, isNew: false } } : m,
            ),
          )
          newTimersRef.current.delete(n.id)
        }, 5000)
        newTimersRef.current.set(n.id, t)
      }
    })

    // clear timers for nodes no longer needing them (removed or isNew flipped)
    for (const [id, t] of newTimersRef.current) {
      const stillNew = nodes.some((n) => n.id === id && n.data?.isNew)
      if (!stillNew) {
        clearTimeout(t)
        newTimersRef.current.delete(id)
      }
    }
  }, [nodes, setNodes])

  // clear all timers on unmount
  useEffect(() => {
    const timers = newTimersRef.current
    return () => {
      for (const [, t] of timers) clearTimeout(t)
      timers.clear()
    }
  }, [])

  return (
    <div className="w-full h-full">
      <ActionPanel
        onAddNode={handleAddNode}
        enableSelection={enableSelection}
        setEnableSelection={setEnableSelection}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        isLocked={isLocked}
        toggleLock={() => setIsLocked((v) => !v)}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Graph-only sidebar (style controls) */}
      {viewMode === 'graph' &&
        !isDragging &&
        !moving &&
        !isResizingNode &&
        !isSelecting && (
          <div className="absolute top-16 left-1 w-auto max-w-[300px] h-auto z-50">
            <GraphSidebar />
          </div>
        )}

      {viewMode === 'graph' ? (
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
        />
      ) : (
        <DefaultBoardView />
      )}
    </div>
  )
}
