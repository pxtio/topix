import { useCallback } from 'react'
import { getViewportForBounds } from '@xyflow/react'
import { toBlob } from 'html-to-image'
import { toast } from 'sonner'

import type { LinkEdge, NoteNode } from '../types/flow'

type UseExportSelectionPngParams = {
  nodes: NoteNode[]
  edges: LinkEdge[]
  selectedNodes: NoteNode[]
  setNodes: (updater: NoteNode[] | ((prev: NoteNode[]) => NoteNode[])) => void
  setEdges: (updater: LinkEdge[] | ((prev: LinkEdge[]) => LinkEdge[])) => void
  onSuccess?: () => void
}

const EXPORT_PADDING = 24
const EXPORT_PIXEL_RATIO = 4

type NodeBounds = { x: number; y: number; width: number; height: number }


/**
 * Reads a node's rendered bounds, preferring absolute/measured values from React Flow.
 */
const getNodeBounds = (node: NoteNode): NodeBounds => {
  const absolute = (node as { positionAbsolute?: { x: number; y: number } }).positionAbsolute
  const x = absolute?.x ?? node.position.x
  const y = absolute?.y ?? node.position.y
  const width = node.width ?? (node as { measured?: { width?: number } }).measured?.width ?? 120
  const height = node.height ?? (node as { measured?: { height?: number } }).measured?.height ?? 60
  return { x, y, width, height }
}


/**
 * Computes the bounding box that encloses all selected nodes.
 */
const getSelectionBounds = (selectedNodes: NoteNode[]) => {
  if (!selectedNodes.length) return null
  const bounds = selectedNodes.map(getNodeBounds)
  const minX = Math.min(...bounds.map(node => node.x))
  const minY = Math.min(...bounds.map(node => node.y))
  const maxX = Math.max(...bounds.map(node => node.x + node.width))
  const maxY = Math.max(...bounds.map(node => node.y + node.height))
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}


/**
 * Returns true when a CSS color is visually opaque and usable as export background.
 */
const isOpaqueColor = (color: string) =>
  color &&
  color !== 'transparent' &&
  color !== 'rgba(0, 0, 0, 0)' &&
  color !== 'hsla(0, 0%, 0%, 0)'


/**
 * Finds the nearest non-transparent background color by walking up the viewport ancestors.
 */
const resolveExportBackground = (viewportEl: HTMLElement) => {
  let current: HTMLElement | null = viewportEl
  while (current) {
    const color = getComputedStyle(current).backgroundColor
    if (isOpaqueColor(color)) return color
    current = current.parentElement
  }
  return '#ffffff'
}


const waitForNextPaint = () =>
  new Promise<void>(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })


/**
 * Exposes selection-to-PNG export for board nodes.
 * Supports transparent and non-transparent backgrounds.
 */
export function useExportSelectionPng({
  nodes,
  edges,
  selectedNodes,
  setNodes,
  setEdges,
  onSuccess,
}: UseExportSelectionPngParams) {
  const exportSelectionPng = useCallback(async (transparentBackground: boolean) => {
    if (!selectedNodes.length) {
      toast.error("Select at least one node to export.")
      return
    }

    const viewportEl = document.querySelector('.react-flow__viewport') as HTMLElement | null
    if (!viewportEl) {
      toast.error("Unable to capture selection.")
      return
    }

    const bounds = getSelectionBounds(selectedNodes)
    if (!bounds) {
      toast.error("Unable to resolve selected node bounds.")
      return
    }

    const width = Math.max(1, Math.ceil(bounds.width + EXPORT_PADDING * 2))
    const height = Math.max(1, Math.ceil(bounds.height + EXPORT_PADDING * 2))
    const viewport = getViewportForBounds(bounds, width, height, 0.1, 2, 0)
    const backgroundColor = transparentBackground ? undefined : resolveExportBackground(viewportEl)
    const selectedNodeIds = new Set(selectedNodes.map(node => node.id))
    const attachmentByPointNodeId = new Map(
      nodes
        .filter(node => (node.data as { kind?: string } | undefined)?.kind === 'point')
        .map(node => {
          const attachedToNodeId = (node.data as { attachedToNodeId?: string } | undefined)?.attachedToNodeId
          return [node.id, attachedToNodeId] as const
        }),
    )
    const cleanEdges = edges
      .filter(edge => {
        const sourceAttachedNodeId = attachmentByPointNodeId.get(edge.source)
        const targetAttachedNodeId = attachmentByPointNodeId.get(edge.target)
        if (!sourceAttachedNodeId || !targetAttachedNodeId) return false
        return selectedNodeIds.has(sourceAttachedNodeId) && selectedNodeIds.has(targetAttachedNodeId)
      })
      .map(edge => ({ ...edge, selected: false }))
    const requiredPointNodeIds = new Set<string>()
    for (const edge of cleanEdges) {
      requiredPointNodeIds.add(edge.source)
      requiredPointNodeIds.add(edge.target)
    }
    const cleanNodes = nodes
      .filter(node => {
        const kind = (node.data as { kind?: string } | undefined)?.kind
        if (kind === 'point') return requiredPointNodeIds.has(node.id)
        return selectedNodeIds.has(node.id)
      })
      .map(node => {
        const kind = (node.data as { kind?: string } | undefined)?.kind
        if (kind === 'point') {
          return {
            ...node,
            selected: false,
            data: { ...node.data, endpointActive: false },
          }
        }
        return { ...node, selected: false }
      })

    try {
      setNodes(cleanNodes)
      setEdges(cleanEdges)
      await waitForNextPaint()

      const blob = await toBlob(viewportEl, {
        cacheBust: false,
        backgroundColor,
        width,
        height,
        pixelRatio: EXPORT_PIXEL_RATIO,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
        },
      })

      if (!blob) {
        toast.error("Failed to render PNG.")
        return
      }

      if (!window.isSecureContext || !navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
        toast.error("Clipboard PNG copy is not supported in this browser/context.")
        return
      }

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ])

      onSuccess?.()
      toast.success("PNG copied to clipboard.")
    } catch {
      toast.error("Failed to copy PNG to clipboard.")
    } finally {
      setNodes(nodes)
      setEdges(edges)
    }
  }, [edges, nodes, onSuccess, selectedNodes, setEdges, setNodes])

  return { exportSelectionPng }
}
