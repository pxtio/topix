import { useMemo, useState } from "react"


export interface DebouncedOptions<T> {
  value: T
  delay?: number
}


/**
 * Hook to get a debounced value.
 *
 * @param value - The value to debounce.
 * @param delay - The debounce delay in milliseconds. Default is 300ms.
 * @returns The debounced value.
 */
export function useDebouncedValue<T>({ value, delay = 300 }: DebouncedOptions<T>) {
  const [debounced, setDebounced] = useState<T>(value)

  useMemo(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}