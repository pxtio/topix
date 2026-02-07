import { useCallback } from 'react'
import type { ReactFlowInstance, Viewport } from '@xyflow/react'
import type { NoteNode, LinkEdge } from '../types/flow'
import { saveThumbnailFromNodes } from './use-make-thumbnail'

export type NodeBounds = { x: number; y: number; width: number; height: number, background: string }

const MAX_THUMBNAIL_NODES = 25

const getViewportBounds = (viewport: Viewport, width: number, height: number) => {
  const left = -viewport.x / viewport.zoom
  const top = -viewport.y / viewport.zoom
  const right = (width - viewport.x) / viewport.zoom
  const bottom = (height - viewport.y) / viewport.zoom
  return { left, top, right, bottom }
}

const getNodeBounds = (node: NoteNode): NodeBounds => {
  const abs = (node as { positionAbsolute?: { x: number; y: number } }).positionAbsolute
  const x = abs?.x ?? node.position.x
  const y = abs?.y ?? node.position.y
  const width = node.width ?? (node as { measured?: { width?: number } }).measured?.width ?? 120
  const height = node.height ?? (node as { measured?: { height?: number } }).measured?.height ?? 60
  const background = node.data.style.backgroundColor
  return { x, y, width, height, background }
}

const intersects = (node: NodeBounds, bounds: { left: number; top: number; right: number; bottom: number }) =>
  node.x < bounds.right &&
  node.x + node.width > bounds.left &&
  node.y < bounds.bottom &&
  node.y + node.height > bounds.top

/**
 * Captures a thumbnail of the current board by identifying visible nodes and saving their positions and dimensions.
 */
export const useThumbnailCapture = (boardId?: string) => {
  return useCallback((instance: ReactFlowInstance<NoteNode, LinkEdge>) => {
    if (!boardId) return
    const renderer = document.querySelector('.react-flow__renderer') as HTMLElement | null
    if (!renderer) return
    const rect = renderer.getBoundingClientRect()
    const viewport = instance.getViewport()
    const viewportBounds = getViewportBounds(viewport, rect.width, rect.height)

    const allNodes = instance
      .getNodes()
      .filter(node => (node.data as { kind?: string } | undefined)?.kind !== 'point')
      .map(getNodeBounds)
    const nodesInView = allNodes.filter(node => intersects(node, viewportBounds))
    const nodes = (nodesInView.length ? nodesInView : allNodes).slice(0, MAX_THUMBNAIL_NODES)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void saveThumbnailFromNodes(boardId, nodes)
      })
    })
  }, [boardId])
}
