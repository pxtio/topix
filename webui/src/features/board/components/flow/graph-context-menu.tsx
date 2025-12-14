import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactFlowProps } from '@xyflow/react'

import type { LinkEdge, NoteNode } from '../../types/flow'

type GraphContextMenuProps = {
  nodes: NoteNode[]
  setNodesPersist: (updater: (prev: NoteNode[]) => NoteNode[]) => void
  children: (handlers: {
    onPaneContextMenu: NonNullable<ReactFlowProps<NoteNode, LinkEdge>['onPaneContextMenu']>
    onNodeContextMenu: NonNullable<ReactFlowProps<NoteNode, LinkEdge>['onNodeContextMenu']>
  }) => React.ReactNode
}

export function GraphContextMenu({ nodes, setNodesPersist, children }: GraphContextMenuProps) {
  const [menuPosition, setMenuPosition] = useState<{ x: number, y: number } | null>(null)

  const stats = useMemo(() => {
    let globalMin = Number.POSITIVE_INFINITY
    let globalMax = Number.NEGATIVE_INFINITY
    let selectedMin = Number.POSITIVE_INFINITY
    let selectedMax = Number.NEGATIVE_INFINITY
    const selectedSet = new Set<string>()

    for (const node of nodes) {
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

  return (
    <>
      {children({
        onPaneContextMenu: handlePaneContextMenu,
        onNodeContextMenu: handleNodeContextMenu,
      })}

      {menuPosition && (
        <div
          className='fixed z-50 min-w-[180px] rounded-md border bg-popover text-popover-foreground shadow-lg p-1 text-sm'
          style={{ top: menuPosition.y, left: menuPosition.x }}
          onMouseDown={event => event.stopPropagation()}
          onContextMenu={event => event.preventDefault()}
          role='menu'
          data-graph-context-menu="true"
        >
          <button
            type='button'
            className='w-full px-3 py-2 text-left rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed'
            onClick={handleSendBackward}
            disabled={!canSendBackward}
          >
            Send backward
          </button>
          <button
            type='button'
            className='w-full px-3 py-2 text-left rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed'
            onClick={handleSendForward}
            disabled={!canSendForward}
          >
            Send forward
          </button>
          <button
            type='button'
            className='w-full px-3 py-2 text-left rounded hover:bg-muted'
            onClick={handleSendToBack}
          >
            Send to back
          </button>
          <button
            type='button'
            className='w-full px-3 py-2 text-left rounded hover:bg-muted'
            onClick={handleSendToFront}
          >
            Send to front
          </button>
        </div>
      )}
    </>
  )
}
