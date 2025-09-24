import { useCallback } from 'react'
import { useReactFlow, type FitViewOptions, type Node } from '@xyflow/react'

// Options for fitting nodes in the view
export type FitNodesOptions = Omit<FitViewOptions, 'nodes'> & {
  includeHidden?: boolean
  timeoutMs?: number // how long to wait for measurements before giving up
}

/**
 * A hook that returns a function to fit the view to specified nodes.
 */
export function useFitNodes() {
  const { fitView, getNodes } = useReactFlow()

  const waitUntilMeasured = useCallback(async (ids: string[], timeoutMs = 800) => {
    const start = performance.now()

    const getTargets = () => getNodes().filter(n => ids.includes(n.id))
    const ready = (ns: Node[]) => ns.length > 0 && ns.every(n => n.width && n.height && n.position)

    let targets = getTargets()
    if (ready(targets)) return targets

    return new Promise<Node[]>(resolve => {
      let raf = 0
      const tick = () => {
        targets = getTargets()
        if (ready(targets) || performance.now() - start > timeoutMs) {
          cancelAnimationFrame(raf)
          resolve(targets)
          return
        }
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    })
  }, [getNodes])

  const fitNodes = useCallback(async (ids: string[], options?: FitNodesOptions) => {
    if (!ids?.length) return

    const targets = await waitUntilMeasured(ids, options?.timeoutMs)
    const visible = options?.includeHidden ? targets : targets.filter(n => !n.hidden)
    if (!visible.length) return

    const { padding = 0.2, duration = 0, minZoom, maxZoom = 1 } = options || {}
    await fitView({ nodes: visible, padding, duration, minZoom, maxZoom })
  }, [fitView, waitUntilMeasured])

  return fitNodes
}
