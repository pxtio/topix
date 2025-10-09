import { useEffect, useRef, useState } from 'react'
import { Progress } from '@/components/ui/progress'

type ProgressBarProps = {
  estimatedTime: number  // seconds
  isStop: boolean        // true when the task is done (streaming ended)
}

/**
 * Shows a time-based progress up to 98% while running, then hides when isStop is true
 */
export const ProgressBar = ({ estimatedTime, isStop }: ProgressBarProps) => {
  const [value, setValue] = useState(0)
  const [visible, setVisible] = useState(false)

  const startRef = useRef<number | null>(null)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (!estimatedTime || estimatedTime <= 0) return

    if (!isStop) {
      setVisible(true)
      setValue(0)
      startRef.current = Date.now()

      if (intervalRef.current) clearInterval(intervalRef.current)

      intervalRef.current = window.setInterval(() => {
        if (!startRef.current) return
        const elapsed = (Date.now() - startRef.current) / 1000
        const raw = (elapsed / estimatedTime) * 98
        const next = Math.min(Math.floor(raw), 98)
        setValue(p => (p >= 98 ? 98 : Math.max(p, next)))
      }, 100)
    } else {
      setVisible(false)
      if (intervalRef.current) clearInterval(intervalRef.current)
      startRef.current = null
      setValue(0)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isStop, estimatedTime])

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
