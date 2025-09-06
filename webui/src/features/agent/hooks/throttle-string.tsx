import { useEffect, useRef, useState } from "react"

export function useRafThrottledString(input: string, enabled: boolean) {
  const [value, setValue] = useState(input)
  const frame = useRef<number | null>(null)
  const latest = useRef(input)

  useEffect(() => {
    latest.current = input
    if (!enabled) {
      // no throttling: update immediately
      setValue(input)
      return
    }
    if (frame.current == null) {
      frame.current = requestAnimationFrame(() => {
        frame.current = null
        setValue(latest.current)
      })
    }
    return () => {
      if (frame.current != null) cancelAnimationFrame(frame.current)
      frame.current = null
    }
  }, [input, enabled])

  return value
}
