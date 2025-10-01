import * as React from "react"

type RevealOpts = {
  enabled?: boolean            // animate only when streaming
  cps?: number                 // characters per second (default 90)
  minChunk?: number            // lower bound per frame (default 1)
  maxChunk?: number            // upper bound per frame (default 32)
  catchUpFactor?: number       // accelerate if very behind (default 1.0 = off)
}

/**
 * Incrementally reveals `input` to produce a smooth typewriter effect.
 * Keeps Markdown valid by only ever passing a prefix of `input`.
 */
export function useSmoothRevealString(
  input: string,
  opts: RevealOpts = {}
) {
  const {
    enabled = false,
    cps = 90,
    minChunk = 1,
    maxChunk = 32,
    catchUpFactor = 1.0
  } = opts

  const [revealed, setRevealed] = React.useState(input)
  const targetRef = React.useRef(input)
  const rafRef = React.useRef<number | null>(null)
  const lastTsRef = React.useRef<number | null>(null)

  // keep latest target
  React.useEffect(() => {
    targetRef.current = input
  }, [input])

  // hard sync when disabled or input shrinks (reset)
  React.useEffect(() => {
    if (!enabled || input.length < revealed.length) {
      setRevealed(input)
    }
  }, [enabled, input])

  // animator loop
  React.useEffect(() => {
    if (!enabled) return

    const loop = (ts: number) => {
      const last = lastTsRef.current ?? ts
      const dt = (ts - last) / 1000
      lastTsRef.current = ts

      const target = targetRef.current
      if (revealed === target) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const remaining = target.length - revealed.length

      // base chars to add this frame from cps and dt
      let delta = Math.floor(cps * dt)
      if (catchUpFactor > 1 && remaining > cps) {
        delta = Math.floor(delta * catchUpFactor)
      }
      delta = Math.max(minChunk, Math.min(maxChunk, delta, remaining))

      if (delta > 0) {
        setRevealed(prev => target.slice(0, prev.length + delta))
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTsRef.current = null
    }
  // intentionally depend only on `enabled` and `revealed` so we keep animating as target grows
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, revealed])

  return revealed
}