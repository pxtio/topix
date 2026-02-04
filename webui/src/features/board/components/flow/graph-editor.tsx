import {
  ReactFlow,
  MarkerType,
  useReactFlow,
  SelectionMode,
  useOnViewportChange,
  type ReactFlowInstance,
  type OnNodesChange,
  type OnEdgesChange,
  type OnNodesDelete,
  type OnEdgesDelete,
  type ReactFlowProps,
} from '@xyflow/react'
import '@xyflow/react/dist/base.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/shallow'

import { NodeView } from './node-view'
import { PointNode } from './point-node'
import { DocumentNode } from './document-node'
import { EdgeView } from './edge/edge-view'
import { EdgeMarkerDefs } from './edge/edge-markers'
import { GraphSidebar } from '../style-panel/panel'
import { ActionPanel } from './action-panel'
import { DefaultBoardView } from '../default-view'
import { NodePlacementOverlay } from './node-placement-overlay'
import { LinePlacementOverlay } from './line-placement-overlay'
import { GraphContextMenu } from './graph-context-menu'
import { NavigableMiniMap } from './navigable-minimap'

import { useGraphStore } from '../../store/graph-store'
import type { LinkEdge, NoteNode } from '../../types/flow'
import type { NodeType } from '../../types/style'
import type { Link } from '../../types/link'

import { useAddNoteNode, type AddNoteNodeOptions } from '../../hooks/use-add-node'
import { useDecoratedEdges } from '../../hooks/use-decorated-edges'
import { usePlaceLine } from '../../hooks/use-place-line'
import { useMindMapStore } from '@/features/agent/store/mindmap-store'
import { useAddMindMapToBoard } from '../../api/add-mindmap-to-board'
import { useCopyPasteNodes } from '../../hooks/use-copy-paste'
import { useCenterAroundParam } from '../../hooks/use-center-around'
import { useBoardShortcuts } from '../../hooks/use-board-shortcuts'
import { PresentationControls } from './presentation-controls'
import { useTheme } from '@/components/theme-provider'
import { darkModeDisplayHex } from '../../lib/colors/dark-variants'
import { applyBackgroundAlpha } from '../../utils/board-background'

import './graph-styles.css'
import { useSaveThumbnailOnUnmount } from '../../hooks/use-make-thumbnail'

const proOptions = { hideAttribution: true }

const nodeTypes = { default: NodeView, point: PointNode, document: DocumentNode }
const edgeTypes = { default: EdgeView }

const defaultEdgeOptions = {
  type: 'default',
  zIndex: 1000,
  style: {
    stroke: 'var(--secondary)',
    strokeWidth: 2,
    strokeDasharray: '8 6',
    strokeLinecap: 'round' as const,
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: 'var(--secondary)',
    width: 22,
    height: 22,
  },
}

const FLOATING_UI_REAPPEAR_DELAY = 400

const drawableNodeTypes: NodeType[] = [
  'rectangle',
  'ellipse',
  'diamond',
  'soft-diamond',
  'layered-diamond',
  'layered-circle',
  'tag',
  'layered-rectangle',
  'thought-cloud',
  'capsule',
  'slide',
]

const isDrawableNodeType = (nodeType: NodeType) => drawableNodeTypes.includes(nodeType)
const ensureLinkData = (edge: LinkEdge): Link => edge.data as Link

type ViewMode = 'graph' | 'linear'

type GraphViewProps = {
  nodes: NoteNode[]
  edges: LinkEdge[]
  onNodesChange: OnNodesChange<NoteNode>
  onEdgesChange: OnEdgesChange<LinkEdge>
  onNodesDelete: OnNodesDelete<NoteNode>
  onEdgesDelete: OnEdgesDelete<LinkEdge>
  enableSelection: boolean
  isLocked: boolean
  onNodeDragStart: () => void
  onNodeDragStop: () => void
  onSelectionStart: () => void
  onSelectionEnd: () => void
  onSelectionDragStart: () => void
  onSelectionDragStop: () => void
  onInit: (instance: ReactFlowInstance<NoteNode, LinkEdge>) => void
  onPaneContextMenu?: ReactFlowProps<NoteNode, LinkEdge>['onPaneContextMenu']
  onNodeContextMenu?: ReactFlowProps<NoteNode, LinkEdge>['onNodeContextMenu']
  onEdgeDoubleClick?: ReactFlowProps<NoteNode, LinkEdge>['onEdgeDoubleClick']
  children?: React.ReactNode
}

/**
 * Pure graph view (React Flow)
 */
function GraphView({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodesDelete,
  onEdgesDelete,
  enableSelection,
  isLocked,
  onNodeDragStart,
  onNodeDragStop,
  onSelectionStart,
  onSelectionEnd,
  onSelectionDragStart,
  onSelectionDragStop,
  onInit,
  onPaneContextMenu,
  onNodeContextMenu,
  onEdgeDoubleClick,
  children,
}: GraphViewProps) {
  return (
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
      defaultEdgeOptions={defaultEdgeOptions}
      selectionOnDrag={enableSelection}
      selectionMode={SelectionMode.Full}
      panOnDrag={!isLocked && !enableSelection}
      selectionKeyCode={null}
      onNodeDragStart={onNodeDragStart}
      onNodeDragStop={onNodeDragStop}
      onSelectionStart={onSelectionStart}
      onSelectionEnd={onSelectionEnd}
      onSelectionDragStart={onSelectionDragStart}
      onSelectionDragStop={onSelectionDragStop}
      onPaneContextMenu={onPaneContextMenu}
      onNodeContextMenu={onNodeContextMenu}
      onEdgeDoubleClick={onEdgeDoubleClick}
      nodesDraggable={!isLocked}
      nodesConnectable={false}
      elementsSelectable={!isLocked}
      zoomOnScroll={!isLocked}
      zoomOnPinch={!isLocked}
      zoomOnDoubleClick={false}
      panOnScroll={!isLocked}
      minZoom={0.32}
      onlyRenderVisibleElements
      onInit={onInit}
      elevateNodesOnSelect={false}
      elevateEdgesOnSelect={true}
    >
      {children}
    </ReactFlow>
  )
}

/**
 * Linear view (your existing default board)
 */
function LinearView() {
  return <DefaultBoardView />
}

/**
 * Main editor: always shows ActionPanel and switches between GraphView / LinearView
 */
export default function GraphEditor() {
  const [viewMode, setViewMode] = useState<ViewMode>('graph')

  const enableSelection = useGraphStore(state => state.isSelectMode)
  const setEnableSelection = useGraphStore(state => state.setIsSelectMode)
  const [shouldRecenter, setShouldRecenter] = useState<boolean>(false)
  const [isLocked, setIsLocked] = useState<boolean>(false)
  const [isSelecting, setIsSelecting] = useState<boolean>(false)
  const [pendingPlacement, setPendingPlacement] = useState<AddNoteNodeOptions | null>(null)
  const {
    pending: pendingLinePlacement,
    begin: beginLinePlacement,
    cancel: cancelLinePlacement,
    place: handlePlaceLine,
  } = usePlaceLine()
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null)
  const [edgeLabelDraft, setEdgeLabelDraft] = useState<string>('')
  const [showMiniMap, setShowMiniMap] = useState<boolean>(true)
  const [showStylePanel, setShowStylePanel] = useState<boolean>(true)

  const {
    zoomIn,
    zoomOut,
    fitView,
    viewportInitialized,
    zoomTo,
    screenToFlowPosition,
    setCenter,
  } = useReactFlow<NoteNode, LinkEdge>()

  const boardId = useGraphStore(state => state.boardId)

  const nodes = useGraphStore(useShallow(state => state.nodes))
  const edges = useGraphStore(useShallow(state => state.edges))

  const setNodes = useGraphStore(state => state.setNodes)
  const setEdgesPersist = useGraphStore(state => state.setEdgesPersist)
  const onNodesChange = useGraphStore(state => state.onNodesChange)
  const onEdgesChange = useGraphStore(state => state.onEdgesChange)
  const onNodesDelete = useGraphStore(state => state.onNodesDelete)
  const onEdgesDelete = useGraphStore(state => state.onEdgesDelete)
  const setNodesPersist = useGraphStore(state => state.setNodesPersist)
  const undo = useGraphStore(state => state.undo)
  const redo = useGraphStore(state => state.redo)

  const isResizingNode = useGraphStore(state => state.isResizingNode)
  const isDragging = useGraphStore(state => state.isDragging)
  const setIsDragging = useGraphStore(state => state.setIsDragging)
  const isMoving = useGraphStore(state => state.isMoving)
  const setIsMoving = useGraphStore(state => state.setIsMoving)
  const setZoom = useGraphStore(state => state.setZoom)
  const graphViewports = useGraphStore(useShallow(state => state.graphViewports))
  const setGraphViewport = useGraphStore(state => state.setGraphViewport)
  const presentationMode = useGraphStore(state => state.presentationMode)
  const setPresentationMode = useGraphStore(state => state.setPresentationMode)
  const activeSlideId = useGraphStore(state => state.activeSlideId)
  const setActiveSlideId = useGraphStore(state => state.setActiveSlideId)
  const setLastCursorPosition = useGraphStore(state => state.setLastCursorPosition)
  const boardBackground = useGraphStore(state => state.boardBackground)

  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const displayBoardBackground = applyBackgroundAlpha(
    isDark ? darkModeDisplayHex(boardBackground) || boardBackground : boardBackground,
    0.5
  ) || undefined

  const mindmaps = useMindMapStore(state => state.mindmaps)
  const { addMindMapToBoardAsync } = useAddMindMapToBoard()

  useCopyPasteNodes({
    jitterMax: 40,
    shortcuts: true,
  })

  useCenterAroundParam({ setCenter })

  useBoardShortcuts({
    enabled: viewMode === 'graph',
    shortcuts: [
      { key: 'z', withMod: true, withShift: false, handler: undo },
      { key: 'z', withMod: true, withShift: true, handler: redo },
      { key: 'y', withMod: true, handler: redo },
    ],
  })

  const addNoteNode = useAddNoteNode()

  const beginPlacement = useCallback((options: AddNoteNodeOptions) => {
    if (!options.nodeType) return
    setPendingPlacement({
      ...options,
      position: undefined,
      size: undefined,
    })
  }, [])

  const cancelPlacement = useCallback(() => {
    setPendingPlacement(null)
  }, [])

  const handlePlacementComplete = useCallback(
    (options: AddNoteNodeOptions) => {
      addNoteNode(options)
      setPendingPlacement(null)
    },
    [addNoteNode],
  )

  useEffect(() => {
    if (viewMode !== 'graph' && pendingPlacement) {
      cancelPlacement()
    }
    if (viewMode !== 'graph' && pendingLinePlacement) {
      cancelLinePlacement()
    }
    if (viewMode !== 'graph' && editingEdgeId) {
      setEditingEdgeId(null)
      setEdgeLabelDraft('')
    }
  }, [viewMode, pendingPlacement, pendingLinePlacement, cancelPlacement, cancelLinePlacement, editingEdgeId])

  useEffect(() => {
    if (!editingEdgeId) return
    const stillExists = edges.some(edge => edge.id === editingEdgeId)
    if (!stillExists) {
      setEditingEdgeId(null)
      setEdgeLabelDraft('')
    }
  }, [edges, editingEdgeId])

  const handlePaneDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (viewMode !== 'graph') return
      if (!screenToFlowPosition) return
      if ((event.target as HTMLElement | null)?.closest('.react-flow__node')) return
      if ((event.target as HTMLElement | null)?.closest('.react-flow__edge')) return
      const flowPoint = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      addNoteNode({ nodeType: 'text', position: flowPoint })
    },
    [viewMode, screenToFlowPosition, addNoteNode],
  )

  const handlePaneMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (viewMode !== 'graph') return
      if (!screenToFlowPosition) return
      const flowPoint = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      setLastCursorPosition(flowPoint)
    },
    [viewMode, screenToFlowPosition, setLastCursorPosition],
  )

  const handlePanelAddNode = useCallback(
    (options: AddNoteNodeOptions) => {
      const nodeType = options.nodeType ?? 'rectangle'
      if (isDrawableNodeType(nodeType) && !options.imageUrl && !options.icon) {
        beginPlacement({ ...options, nodeType })
        return
      }
      addNoteNode(options)
    },
    [addNoteNode, beginPlacement],
  )

  const handleAddLine = useCallback(() => {
    beginLinePlacement()
  }, [beginLinePlacement])

  const handleEdgeDoubleClick = useCallback<NonNullable<ReactFlowProps<NoteNode, LinkEdge>['onEdgeDoubleClick']>>(
    (event, edge) => {
      event.preventDefault()
      event.stopPropagation()
      setEditingEdgeId(edge.id)
      setEdgeLabelDraft(edge.data?.label?.markdown ?? '')
    },
    [],
  )

  const handleEdgeLabelChange = useCallback((value: string) => {
    setEdgeLabelDraft(value)
  }, [])

  const handleEdgeLabelCancel = useCallback(() => {
    setEditingEdgeId(null)
    setEdgeLabelDraft('')
  }, [])

  const handleEdgeControlPointChange = useCallback(
    (edgeId: string, position: { x: number; y: number }) => {
      if (!boardId) return
      setEdgesPersist(prev =>
        prev.map(edge => {
          if (edge.id !== edgeId) return edge
          const linkData = ensureLinkData(edge)
          const nextLink: Link = {
            ...linkData,
            properties: {
              ...linkData.properties,
              edgeControlPoint: { type: 'position', position },
            },
          }
          return {
            ...edge,
            data: nextLink,
          }
        }),
      )
    },
    [boardId, setEdgesPersist],
  )

  const handleEdgeLabelSave = useCallback(() => {
    if (!editingEdgeId) return
    setEdgesPersist(prev =>
      prev.map(edge =>
        edge.id === editingEdgeId
          ? {
              ...edge,
              data: {
                ...ensureLinkData(edge),
                label: edgeLabelDraft.trim()
                  ? { markdown: edgeLabelDraft }
                  : undefined,
              } as Link,
            }
          : edge,
      ),
    )
    setEditingEdgeId(null)
    setEdgeLabelDraft('')
  }, [editingEdgeId, edgeLabelDraft, setEdgesPersist])

  const edgesForRender = useDecoratedEdges({
    edges,
    editingEdgeId,
    edgeLabelDraft,
    onControlPointChange: handleEdgeControlPointChange,
    labelHandlers: {
      onLabelChange: handleEdgeLabelChange,
      onLabelSave: handleEdgeLabelSave,
      onLabelCancel: handleEdgeLabelCancel,
    },
  })

  const rfInstanceRef = useRef<ReactFlowInstance<NoteNode, LinkEdge> | null>(null)
  const slides = useMemo(
    () => (nodes as NoteNode[])
      .filter(n => n.data?.style?.type === 'slide')
      .sort((a, b) => (a.data.properties.slideNumber?.number ?? 0) - (b.data.properties.slideNumber?.number ?? 0)),
    [nodes]
  )
  const slideIds = useMemo(() => slides.map(s => s.id), [slides])

  // Mindmap integration
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
  const handleResetZoom = useCallback(() => {
    zoomTo(1)
  }, [zoomTo])

  const handleToggleLock = useCallback(() => {
    setIsLocked(value => !value)
  }, [setIsLocked])

  const getCurrentViewport = useCallback(() => {
    return rfInstanceRef.current?.getViewport?.() ?? null
  }, [])

  const handleMiniMapNavigate = useCallback(
    ({ x, y }: { x: number; y: number }, zoom: number) => {
      const instance = rfInstanceRef.current
      if (!instance?.setCenter) return
      instance.setCenter(x, y, { zoom, duration: 150 })
    },
    [],
  )


  const handleDragStart = useCallback(() => setIsDragging(true), [setIsDragging])
  const handleDragStop = useCallback(() => setIsDragging(false), [setIsDragging])
  const handleSelectionStart = useCallback(() => setIsSelecting(true), [])
  const handleSelectionDragStart = useCallback(() => setIsSelecting(true), [])
  const handleSelectionEnd = useCallback(() => setIsSelecting(false), [])
  const handleSelectionDragStop = useCallback(() => setIsSelecting(false), [])

  const activeSlideIndex = activeSlideId ? slideIds.indexOf(activeSlideId) : -1
  const canPrev = activeSlideIndex > 0
  const canNext = activeSlideIndex >= 0 && activeSlideIndex < slideIds.length - 1

  const goToSlide = useCallback(async (index: number) => {
    const node = slides[index]
    if (!node) return
    setActiveSlideId(node.id)
    await fitView({ nodes: [node], padding: 0.2, duration: 250 })
  }, [fitView, setActiveSlideId, slides])

  const restoreViewport = useCallback(() => {
    if (!boardId) return
    const saved = graphViewports[boardId]
    if (saved && rfInstanceRef.current?.setViewport) {
      rfInstanceRef.current.setViewport(saved, { duration: 200 })
    }
  }, [boardId, graphViewports])

  useBoardShortcuts({
    enabled: presentationMode,
    shortcuts: [
      { key: 'arrowleft', handler: () => canPrev && goToSlide(activeSlideIndex - 1) },
      { key: 'arrowright', handler: () => canNext && goToSlide(activeSlideIndex + 1) },
      { key: 'escape', handler: () => {
        setPresentationMode(false)
        setActiveSlideId(undefined)
        setEnableSelection(false)
        restoreViewport()
      } },
    ],
  })

  useOnViewportChange({
    onStart: () => {
      setIsMoving(true)
    },
    onEnd: vp => {
      if (boardId && !presentationMode) {
        setGraphViewport(boardId, vp)
      }
      setZoom(vp.zoom)
      setIsMoving(false)
    },
  })

  const moving = isMoving
  const shouldHideFloatingUi = viewMode !== 'graph' || moving || isDragging || isResizingNode || isSelecting
  const miniMapTimeoutRef = useRef<number | null>(null)
  const stylePanelTimeoutRef = useRef<number | null>(null)

  const clearDeferredUiTimeouts = useCallback(() => {
    if (miniMapTimeoutRef.current) {
      clearTimeout(miniMapTimeoutRef.current)
      miniMapTimeoutRef.current = null
    }
    if (stylePanelTimeoutRef.current) {
      clearTimeout(stylePanelTimeoutRef.current)
      stylePanelTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    if (shouldHideFloatingUi) {
      clearDeferredUiTimeouts()
      setShowMiniMap(false)
      setShowStylePanel(false)
      return
    }

    miniMapTimeoutRef.current = window.setTimeout(() => {
      setShowMiniMap(true)
      miniMapTimeoutRef.current = null
    }, FLOATING_UI_REAPPEAR_DELAY)

    stylePanelTimeoutRef.current = window.setTimeout(() => {
      setShowStylePanel(true)
      stylePanelTimeoutRef.current = null
    }, FLOATING_UI_REAPPEAR_DELAY)

    return () => {
      clearDeferredUiTimeouts()
    }
  }, [shouldHideFloatingUi, clearDeferredUiTimeouts])

  // --- frontend-only expiration for data.isNew ---
  const newTimersRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    // schedule timers for nodes that are marked isNew and don't already have one
    nodes.forEach(n => {
      const isNew = !!n.data?.isNew
      const hasTimer = newTimersRef.current.has(n.id)
      if (isNew && !hasTimer) {
        const t = window.setTimeout(() => {
          setNodes(ns =>
            ns.map(m =>
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
      const stillNew = nodes.some(n => n.id === id && n.data?.isNew)
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

  // capture thumbnail of current graph view on unmount
  useSaveThumbnailOnUnmount(boardId || '')

  const handleInit = (instance: ReactFlowInstance<NoteNode, LinkEdge>) => {
    rfInstanceRef.current = instance
    if (boardId) {
      const saved = graphViewports[boardId]
      if (saved) {
        // restore immediately, no animation
        instance.setViewport(saved, { duration: 0 })
      }
    }
  }

  return (
    <div className="w-full h-full relative">
      <ActionPanel
        onAddNode={handlePanelAddNode}
        onAddLine={handleAddLine}
        enableSelection={enableSelection}
        setEnableSelection={setEnableSelection}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onResetZoom={handleResetZoom}
        isLocked={isLocked}
        toggleLock={handleToggleLock}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Graph-only sidebar (style controls) */}
      {viewMode === 'graph' &&
        showStylePanel &&
        !presentationMode &&
        !isDragging &&
        !moving &&
        !isResizingNode &&
        !isSelecting && (
          <div className="absolute top-16 left-1 w-auto max-w-[300px] h-auto z-50">
            <GraphSidebar />
          </div>
        )}

      <div
        className="relative w-full h-full"
        style={{ backgroundColor: displayBoardBackground }}
        onDoubleClick={handlePaneDoubleClick}
        onMouseMove={handlePaneMouseMove}
      >
        {viewMode === 'graph' ? (
          <GraphContextMenu nodes={nodes} setNodesPersist={setNodesPersist}>
            {({ onPaneContextMenu, onNodeContextMenu }) => (
              <>
                <GraphView
                  nodes={nodes}
                  edges={edgesForRender}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onNodesDelete={onNodesDelete}
                  onEdgesDelete={onEdgesDelete}
                  enableSelection={enableSelection}
                  isLocked={isLocked}
                  onNodeDragStart={handleDragStart}
                  onNodeDragStop={handleDragStop}
                  onSelectionStart={handleSelectionStart}
                  onSelectionEnd={handleSelectionEnd}
                  onSelectionDragStart={handleSelectionDragStart}
                  onSelectionDragStop={handleSelectionDragStop}
                  onInit={handleInit}
                  onPaneContextMenu={onPaneContextMenu}
                  onNodeContextMenu={onNodeContextMenu}
                  onEdgeDoubleClick={handleEdgeDoubleClick}
                >
                  <EdgeMarkerDefs edges={edges} />
                  {showMiniMap &&
                    !presentationMode &&
                    !moving &&
                    !isDragging &&
                    !isResizingNode &&
                    !isSelecting && (
                    <NavigableMiniMap
                      nodes={nodes}
                      onNavigate={handleMiniMapNavigate}
                      getCurrentViewport={getCurrentViewport}
                    />
                  )}
                </GraphView>

                <NodePlacementOverlay
                  pendingPlacement={pendingPlacement}
                  onPlace={handlePlacementComplete}
                  onCancel={cancelPlacement}
                  screenToFlowPosition={screenToFlowPosition}
                />
                <LinePlacementOverlay
                  pending={pendingLinePlacement}
                  onPlace={handlePlaceLine}
                  onCancel={cancelLinePlacement}
                  screenToFlowPosition={screenToFlowPosition}
                />
              </>
            )}
          </GraphContextMenu>
        ) : (
          <LinearView />
        )}
      </div>

      {presentationMode && (
        <PresentationControls
          onPrev={() => canPrev && goToSlide(activeSlideIndex - 1)}
          onNext={() => canNext && goToSlide(activeSlideIndex + 1)}
          onStop={() => {
            setPresentationMode(false)
            setActiveSlideId(undefined)
            setEnableSelection(false)
            restoreViewport()
          }}
          disablePrev={!canPrev}
          disableNext={!canNext}
        />
      )}
    </div>
  )
}
