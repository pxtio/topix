import { useLayoutEffect, useRef, useState } from 'react'
import { useUpdateNodeInternals } from '@xyflow/react'


/**
 * Custom hook to manage and set the minimum height of a node based on its content.
 * It uses a ResizeObserver to monitor changes in the content's height and updates
 * the node's minHeight style property accordingly. It also notifies React Flow
 * to update the node internals when the minHeight changes.
 *
 * @param nodeId - The ID of the node to manage.
 * @param extra - Additional pixels to add to the content height for padding (default is 24).
 * @param floor - Minimum height floor value (default is 100).
 * @returns An object containing a ref to attach to the content element and the computed minimum height.
 */
export function useContentMinHeight(nodeId: string, extra = 0, floor = 100) {
  const updateNodeInternals = useUpdateNodeInternals()
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [contentH, setContentH] = useState(0)

  const computedMinH = Math.max(floor, Math.ceil(contentH + extra))

  // measure content
  useLayoutEffect(() => {
    if (!contentRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      setContentH(Math.ceil(entry.contentRect.height))
    })
    ro.observe(contentRef.current)
    return () => ro.disconnect()
  }, [])

  // set wrapper's minHeight imperatively + notify RF
  useLayoutEffect(() => {
    const sel = `.react-flow__node[data-id="${CSS?.escape ? CSS.escape(nodeId) : nodeId}"]`
    const el = document.querySelector<HTMLElement>(sel)
    if (el) el.style.minHeight = `${computedMinH}px`
    updateNodeInternals(nodeId)
  }, [nodeId, computedMinH, updateNodeInternals])

  return { contentRef, computedMinH }
}