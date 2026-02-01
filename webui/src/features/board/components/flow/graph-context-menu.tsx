import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactFlowProps } from '@xyflow/react'

import type { LinkEdge, NoteNode } from '../../types/flow'
import { HugeiconsIcon } from '@hugeicons/react'
import { LayerBringForwardIcon, LayerBringToFrontIcon, LayerSendBackwardIcon, LayerSendToBackIcon, CancelIcon, CheckmarkCircle03Icon, ReloadIcon } from '@hugeicons/core-free-icons'
import { Sparkles } from 'lucide-react'
import { useGraphStore } from '../../store/graph-store'
import { useConvertToMindMap } from '../../api/convert-to-mindmap'
import { buildContextTextFromNodes } from '../../utils/context-text'
import { toast } from 'sonner'

/**
 * Props for the GraphContextMenu component.
 */
type GraphContextMenuProps = {
  nodes: NoteNode[]
  setNodesPersist: (updater: (prev: NoteNode[]) => NoteNode[]) => void
  children: (handlers: {
    onPaneContextMenu: NonNullable<ReactFlowProps<NoteNode, LinkEdge>['onPaneContextMenu']>
    onNodeContextMenu: NonNullable<ReactFlowProps<NoteNode, LinkEdge>['onNodeContextMenu']>
  }) => React.ReactNode
}

/**
 * A context menu for the graph that appears on right-clicking
 * selected nodes or the pane when nodes are selected.
 * Allows changing z-index and performing AI actions on selected nodes.
 */
export function GraphContextMenu({ nodes, setNodesPersist, children }: GraphContextMenuProps) {
  const [menuPosition, setMenuPosition] = useState<{ x: number, y: number } | null>(null)

  const stats = useMemo(() => {
    let globalMin = Number.POSITIVE_INFINITY
    let globalMax = Number.NEGATIVE_INFINITY
    let selectedMin = Number.POSITIVE_INFINITY
    let selectedMax = Number.NEGATIVE_INFINITY
    const selectedSet = new Set<string>()

    for (const node of nodes) {
      const kind = (node.data as { kind?: string } | undefined)?.kind
      if (kind === 'point') continue
      const z = node.zIndex ?? 0
      if (z < globalMin) globalMin = z
      if (z > globalMax) globalMax = z

      if (node.selected) {
        selectedSet.add(node.id)
        if (z < selectedMin) selectedMin = z
        if (z > selectedMax) selectedMax = z
      }
    }

    const hasSelection = selectedSet.size > 0

    return {
      selectedSet,
      hasSelection,
      globalMin: globalMin === Number.POSITIVE_INFINITY ? 0 : globalMin,
      globalMax: globalMax === Number.NEGATIVE_INFINITY ? 0 : globalMax,
      selectedMin: selectedMin === Number.POSITIVE_INFINITY ? 0 : selectedMin,
      selectedMax: selectedMax === Number.NEGATIVE_INFINITY ? 0 : selectedMax,
    }
  }, [nodes])

  const { selectedSet, hasSelection, globalMin, globalMax, selectedMin, selectedMax } = stats
  const canSendBackward = hasSelection && selectedMin > globalMin
  const canSendForward = hasSelection && selectedMax < globalMax
  const boardId = useGraphStore(state => state.boardId)
  const { convertToMindMapAsync } = useConvertToMindMap()
  const [aiProcessing, setAiProcessing] = useState<string | null>(null)

  const selectedNodes = useMemo(
    () => nodes.filter((node) => node.selected && (node.data as { kind?: string } | undefined)?.kind !== 'point'),
    [nodes],
  )

  const openMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    setMenuPosition({ x: event.clientX, y: event.clientY })
  }, [])

  const handlePaneContextMenu = useCallback<NonNullable<ReactFlowProps<NoteNode, LinkEdge>['onPaneContextMenu']>>((event) => {
    if (!hasSelection) return
    openMenu(event as React.MouseEvent)
  }, [hasSelection, openMenu])

  const handleNodeContextMenu = useCallback<NonNullable<ReactFlowProps<NoteNode, LinkEdge>['onNodeContextMenu']>>((event, node) => {
    if (!node?.selected) return
    openMenu(event as React.MouseEvent)
  }, [openMenu])

  useEffect(() => {
    if (!menuPosition) return
    const close = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-graph-context-menu="true"]')) return
      setMenuPosition(null)
    }
    const listenerOptions: AddEventListenerOptions = { capture: true }
    window.addEventListener('mousedown', close, listenerOptions)
    return () => window.removeEventListener('mousedown', close, listenerOptions)
  }, [menuPosition])

  const applyToSelected = useCallback((updater: (z: number) => number) => {
    if (selectedSet.size === 0) return
    setNodesPersist(prev =>
      prev.map(node => {
        if (!selectedSet.has(node.id)) return node
        const kind = (node.data as { kind?: string } | undefined)?.kind
        if (kind === 'point') return node
        const currentZ = node.zIndex ?? 0
        return { ...node, zIndex: updater(currentZ) }
      }),
    )
    setMenuPosition(null)
  }, [selectedSet, setNodesPersist])

  const handleSendBackward = useCallback(() => {
    if (!canSendBackward) return
    applyToSelected(z => z - 1)
  }, [applyToSelected, canSendBackward])

  const handleSendForward = useCallback(() => {
    if (!canSendForward) return
    applyToSelected(z => z + 1)
  }, [applyToSelected, canSendForward])

  const handleSendToBack = useCallback(() => {
    if (selectedSet.size === 0) return
    const target = globalMin - 1
    applyToSelected(() => target)
  }, [applyToSelected, globalMin, selectedSet.size])

  const handleSendToFront = useCallback(() => {
    if (selectedSet.size === 0) return
    const target = globalMax + 1
    applyToSelected(() => target)
  }, [applyToSelected, globalMax, selectedSet.size])

  const handleAiAction = useCallback(async (actionLabel: string) => {
    if (!boardId) {
      toast.error("Select a board first.")
      return
    }
    const contextText = buildContextTextFromNodes(selectedNodes)
    if (!contextText) {
      toast.error("Select at least one node with content.")
      return
    }
    if (aiProcessing) return
    setAiProcessing(actionLabel)
    setMenuPosition(null)
    const toastId = toast("Working on it…", {
      duration: Infinity,
      icon: <HugeiconsIcon icon={ReloadIcon} className="size-4 animate-spin [animation-duration:750ms]" strokeWidth={2} />,
    })
    try {
      const answer = `Request: ${actionLabel}\n---\nInput Text:\n${contextText}`
      await convertToMindMapAsync({ boardId, answer, toolType: "summify" })
      toast.success("Added to board.", {
        id: toastId,
        icon: <HugeiconsIcon icon={CheckmarkCircle03Icon} className="size-4" strokeWidth={2} />,
      })
      setMenuPosition(null)
    } catch (error) {
      console.error("AI action failed:", error)
      toast.error("Could not complete the action.", {
        id: toastId,
        icon: <HugeiconsIcon icon={CancelIcon} className="size-4" strokeWidth={2} />,
      })
    } finally {
      setAiProcessing(null)
      toast.dismiss(toastId)
    }
  }, [aiProcessing, boardId, convertToMindMapAsync, selectedNodes])

  return (
    <>
      {children({
        onPaneContextMenu: handlePaneContextMenu,
        onNodeContextMenu: handleNodeContextMenu,
      })}

      {menuPosition && (
        <div
          className='fixed z-50 min-w-[180px] max-w-[320px] rounded-md border bg-popover text-popover-foreground shadow-lg p-1 text-sm'
          style={{ top: menuPosition.y, left: menuPosition.x }}
          onMouseDown={event => event.stopPropagation()}
          onContextMenu={event => event.preventDefault()}
          role='menu'
          data-graph-context-menu="true"
        >
          <button
            type='button'
            className='w-full px-3 py-2 text-left rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
            onClick={handleSendBackward}
            disabled={!canSendBackward}
          >
            <HugeiconsIcon icon={LayerSendBackwardIcon} strokeWidth={2} className='size-4' />
            <span>Send backward</span>
          </button>
          <button
            type='button'
            className='w-full px-3 py-2 text-left rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
            onClick={handleSendForward}
            disabled={!canSendForward}
          >
            <HugeiconsIcon icon={LayerBringForwardIcon} strokeWidth={2} className='size-4' />
            <span>Send forward</span>
          </button>
          <button
            type='button'
            className='w-full px-3 py-2 text-left rounded hover:bg-muted flex items-center gap-2'
            onClick={handleSendToBack}
          >
            <HugeiconsIcon icon={LayerSendToBackIcon} strokeWidth={2} className='size-4' />
            <span>Send to back</span>
          </button>
          <button
            type='button'
            className='w-full px-3 py-2 text-left rounded hover:bg-muted flex items-center gap-2'
            onClick={handleSendToFront}
          >
            <HugeiconsIcon icon={LayerBringToFrontIcon} strokeWidth={2} className='size-4' />
            <span>Send to front</span>
          </button>

          {hasSelection && (
            <>
              <div className='my-1 h-px bg-border' />
              <div className='px-3 py-1 text-xs font-medium text-muted-foreground flex items-center gap-2'>
                <Sparkles className='size-3 text-secondary' />
                AI Spark
              </div>
              <button
                type='button'
                className='w-full px-3 py-2 text-left rounded hover:bg-muted flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                onClick={() => handleAiAction("Summarize")}
                disabled={!!aiProcessing}
              >
                <span>Summarize (quick overview)</span>
              </button>
              <button
                type='button'
                className='w-full px-3 py-2 text-left rounded hover:bg-muted flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                onClick={() => handleAiAction("Mapify")}
                disabled={!!aiProcessing}
              >
                <span>Mapify (generate mindmap)</span>
              </button>
              <button
                type='button'
                className='w-full px-3 py-2 text-left rounded hover:bg-muted flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                onClick={() => handleAiAction("Schemify")}
                disabled={!!aiProcessing}
              >
                <span>Schemify (generate schema)</span>
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}
