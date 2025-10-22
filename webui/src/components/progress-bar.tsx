import { useEffect, useRef, useState } from 'react'
import { Progress } from '@/components/ui/progress'

type ProgressBarProps = {
  estimatedTime: number   // seconds
  isStop: boolean         // true when the task is done (streaming ended)
  startedAt?: string      // ISO 8601 string (e.g., "2025-10-22T15:04:05.000Z")
}

/**
 * Time-based progress up to 98% while running.
 * If `startedAt` is provided (ISO string), progress is computed from that timestamp
 * so it won’t restart on remount/navigation.
 */
export const ProgressBar = ({ estimatedTime, isStop, startedAt }: ProgressBarProps) => {
  const [value, setValue] = useState(0)
  const [visible, setVisible] = useState(false)

  const startRef = useRef<number | null>(null)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    const clear = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    if (!estimatedTime || estimatedTime <= 0 || isStop) {
      setVisible(false)
      clear()
      startRef.current = null
      setValue(0)
      return () => clear()
    }

    setVisible(true)

    // Parse ISO (once per effect run)
    let refMs: number | null = null
    if (startedAt) {
      const t = new Date(startedAt).getTime()
      refMs = Number.isFinite(t) ? t : null
    }
    startRef.current = refMs ?? Date.now()

    const computePct = () => {
      if (!startRef.current) return 0
      const elapsedSec = Math.max(0, (Date.now() - startRef.current) / 1000)
      const raw = (elapsedSec / estimatedTime) * 98
      return Math.min(98, Math.floor(raw))
    }

    // immediate paint to avoid flicker
    const initial = computePct()
    setValue(p => Math.max(p, initial))

    clear()
    intervalRef.current = window.setInterval(() => {
      const next = computePct()
      setValue(p => (p >= 98 ? 98 : Math.max(p, next)))
    }, 100)

    return () => clear()
  }, [isStop, estimatedTime, startedAt])

  if (!visible) return null

  return (
    <div className='px-2 pb-2 w-full flex flex-col items-center'>
      <div className='w-full max-w-[250px]'>
        <div className='flex items-center justify-between mb-1'>
          <span className='text-xs text-muted-foreground font-mono'>Estimated</span>
          <span className='text-xs font-mono tabular-nums text-secondary'>{value}%</span>
        </div>
        <Progress value={value} className='h-2' />
      </div>
    </div>
  )
}