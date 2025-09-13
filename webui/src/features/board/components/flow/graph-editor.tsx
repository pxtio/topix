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
import { useAddNoteNode } from '../../hooks/add-node'
import { EdgeView } from './edge-view'
import { CustomConnectionLine } from './connection'
import { useGraphStore } from '../../store/graph-store'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LinkEdge, NoteNode } from '../../types/flow'
import { useRemoveNote } from '../../api/remove-note'
import { useAppStore } from '@/store'
import { useRemoveLink } from '../../api/remove-link'
import { useAddLinks } from '../../api/add-links'
import { convertEdgeToLink } from '../../utils/graph'
import { useAddMindMapToBoard } from '../../api/add-mindmap-to-board'
import { useMindMapStore } from '@/features/agent/store/mindmap-store'
import './graph-styles.css'
import { GraphSidebar } from '../style-panel/panel'
import { useSaveThumbnailOnUnmount } from '../../hooks/make-thumbnail'
import { saveThumbnail } from '../../api/save-thumbnail'
import { useShallow } from 'zustand/shallow'
import { ActionPanel } from './action-panel'
import { LinearView } from './linear-view'
import { useCopyPasteNodes } from '../../hooks/copy-paste'
import { useStyleDefaults } from '../../style-provider'

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

  const { zoomIn, zoomOut, fitView, viewportInitialized } = useReactFlow()

  const userId = useAppStore(state => state.userId)
  const boardId = useGraphStore(state => state.boardId)
  const isLoading = useGraphStore(state => state.isLoading)
  const nodes = useGraphStore(useShallow(state => state.nodes))
  const edges = useGraphStore(useShallow(state => state.edges))
  const onNodesChange = useGraphStore(state => state.onNodesChange)
  const onEdgesChange = useGraphStore(state => state.onEdgesChange)
  const onNodesDelete = useGraphStore(state => state.onNodesDelete)
  const onEdgesDelete = useGraphStore(state => state.onEdgesDelete)
  const onConnect = useGraphStore(state => state.onConnect)
  const mindmaps = useMindMapStore(state => state.mindmaps)
  const isResizingNode = useGraphStore(state => state.isResizingNode)

  const { removeNote } = useRemoveNote()
  const { removeLink } = useRemoveLink()
  const { addLinks } = useAddLinks()
  const { addMindMapToBoardAsync } = useAddMindMapToBoard()

  const { applyDefaultLinkStyle } = useStyleDefaults()

  useCopyPasteNodes({
    jitterMax: 40,
    shortcuts: true
  })

  const deleteNodes: OnNodesDelete<NoteNode> = useCallback((nodes) => {
    if (!boardId || !userId) return
    onNodesDelete(nodes)
    nodes.forEach(node => {
      removeNote({ boardId, userId, noteId: node.id })
    })
  }, [onNodesDelete, boardId, userId, removeNote])

  const deleteEdges: OnEdgesDelete<LinkEdge> = useCallback((edges) => {
    if (!boardId || !userId) return
    onEdgesDelete(edges)
    edges.forEach(edge => {
      removeLink({ boardId, userId, linkId: edge.id })
    })
  }, [onEdgesDelete, boardId, userId, removeLink])

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

  useEffect(() => {
    if (!isLoading) setShouldRecenter(true)
  }, [isLoading])

  useEffect(() => {
    const integrateMindmap = async () => {
      if (boardId && mindmaps.has(boardId)) {
        const added = await addMindMapToBoardAsync()
        if (added) setShouldRecenter(true)
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
    if (viewportInitialized) fitView({ padding: 0.2, minZoom: 1, maxZoom: 1 })
  }, [viewportInitialized, fitView])

  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useSaveThumbnailOnUnmount({
    boardId,
    containerRef: wrapperRef,
    saveThumbnail: async (boardId, blob) => {
      await saveThumbnail({ userId, boardId, blob })
    },
    opts: { width: 360, height: 200, pixelRatio: 1, backgroundColor: 'transparent' },
  })

  const handleZoomIn = useCallback(() => zoomIn({ duration: 200 }), [zoomIn])
  const handleZoomOut = useCallback(() => zoomOut({ duration: 200 }), [zoomOut])
  const handleFitView = useCallback(() => fitView({ padding: 0.2, duration: 250 }), [fitView])

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
  const handleSelectionStart = useCallback(() => setIsSelecting(true), [])
  const handleSelectionDragStart = useCallback(() => setIsSelecting(true), [])
  const handleSelectionEnd = useCallback(() => setIsSelecting(false), [])
  const handleSelectionDragStop = useCallback(() => setIsSelecting(false), [])

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
        toggleLock={() => setIsLocked(v => !v)}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Graph-only sidebar (style controls) */}
      {viewMode === 'graph' && !isDragging && !moving && !isResizingNode && !isSelecting && (
        <div className='absolute top-1 left-1 w-auto max-w-[300px] h-auto z-50'>
          <GraphSidebar />
        </div>
      )}

      {viewMode === 'graph' ? (
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