import * as React from 'react'

interface UseIsInViewOptions {
  inView?: boolean
  inViewOnce?: boolean
  inViewMargin?: string
  inViewRoot?: Element | null
}

function useIsInView<T extends HTMLElement = HTMLElement>(
  ref: React.Ref<T>,
  options: UseIsInViewOptions = {},
) {
  const {
    inView = false,
    inViewOnce = false,
    inViewMargin = '0px',
    inViewRoot = null,
  } = options
  const localRef = React.useRef<T>(null)
  const [intersecting, setIntersecting] = React.useState(false)
  const target = localRef.current

  React.useImperativeHandle(ref, () => localRef.current as T)

  React.useEffect(() => {
    if (!inView) {
      setIntersecting(false)
      return
    }

    const node = target
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        setIntersecting(entry.isIntersecting)
        if (entry.isIntersecting && inViewOnce) {
          observer.disconnect()
        }
      },
      {
        root: inViewRoot ?? null,
        rootMargin: inViewMargin,
      }
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [target, inView, inViewOnce, inViewMargin, inViewRoot])

  const isInView = !inView || intersecting
  return { ref: localRef, isInView }
}

// eslint-disable-next-line react-refresh/only-export-components
export { useIsInView, type UseIsInViewOptions }
