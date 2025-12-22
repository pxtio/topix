import * as React from 'react'

interface UseCheckEleInViewOptions {
  onEnter?: () => void
  root?: Element | null
  margin?: string
  once?: boolean
  enabled?: boolean
}

function useCheckEleInView<T extends HTMLElement = HTMLElement>({
  onEnter,
  root = null,
  margin = '0px',
  once = false,
  enabled = true,
}: UseCheckEleInViewOptions = {}) {
  const [node, setNode] = React.useState<T | null>(null)
  const [inView, setInView] = React.useState(false)

  const ref = React.useCallback((element: T | null) => {
    setNode(element)
  }, [])

  React.useEffect(() => {
    if (!enabled) return
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        if (entry.isIntersecting) {
          setInView(true)
          onEnter?.()
          if (once) observer.disconnect()
        } else {
          setInView(false)
        }
      },
      {
        root,
        rootMargin: margin,
      }
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [node, root, margin, once, enabled, onEnter])

  return { ref, inView }
}

export { useCheckEleInView }
