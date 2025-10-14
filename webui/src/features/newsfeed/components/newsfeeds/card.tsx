import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { formatNewsletterDate } from '../../utils/date'
import { Card, CardContent } from '@/components/ui/card'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon, Folder02Icon } from '@hugeicons/core-free-icons'
import { useDeleteNewsfeed } from '@/features/newsfeed/api/delete-newsfeed'
import { dateToTailwindColor } from '../../utils/color'
import { getLuminance, toBaseHex } from '@/features/board/lib/colors/tailwind'
import { useTheme } from '@/components/theme-provider'
import { darkModeDisplayHex } from '@/features/board/lib/colors/dark-variants'

export function NewsletterCard({
  id,
  subscriptionId,
  createdAt,
  onClick,
  active,
  generating,
  estimatedDuration = 4 * 60 // seconds
}: {
  id: string
  subscriptionId: string
  createdAt: string
  onClick?: () => void
  active?: boolean
  generating?: boolean
  /** estimated generation duration (seconds). default: 4 minutes */
  estimatedDuration?: number
}) {
  const del = useDeleteNewsfeed(subscriptionId)

  // deterministic bg from date (shade 100)
  const { hex } = useMemo(() => dateToTailwindColor(createdAt, 100), [createdAt])
  const base = toBaseHex(hex) ?? '#f5f5f5'

  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const bgColor = isDark ? darkModeDisplayHex(base) ?? '#f5f5f5' : base
  const lum = getLuminance(bgColor)

  const textClass = lum > 0.7 ? 'text-slate-900' : 'text-slate-50'
  const subTextClass = lum > 0.7 ? 'text-slate-700' : 'text-slate-100/80'
  const ringWhenActive = 'ring-2 ring-secondary/40 border-secondary'

  const createdMs = useMemo(() => new Date(createdAt).getTime(), [createdAt])

  // live timer for generating state
  const [elapsedSec, setElapsedSec] = useState<number>(() => Math.max(0, Math.floor((Date.now() - createdMs) / 1000)))

  useEffect(() => {
    if (!generating) return
    setElapsedSec(Math.max(0, Math.floor((Date.now() - createdMs) / 1000)))
    const t = setInterval(() => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - createdMs) / 1000)))
    }, 1000)
    return () => clearInterval(t)
  }, [generating, createdMs])

  // percentage (cap at 99% until server replaces it)
  const pct = useMemo(() => {
    if (!generating) return undefined
    if (estimatedDuration <= 0) return 0
    const value = Math.floor((elapsedSec / estimatedDuration) * 100)
    return Math.min(99, Math.max(0, value))
  }, [generating, elapsedSec, estimatedDuration])

  const title = generating ? 'Generating…' : `Newsletter ${formatNewsletterDate(createdAt)}`
  const subtitle = useMemo(() => {
    if (generating) {
      return `${formatElapsed(elapsedSec)} • ${pct}%`
    }
    return new Date(createdAt).toLocaleString()
  }, [generating, elapsedSec, pct, createdAt])

  const handleDelete = async () => {
    if (generating) return
    const ok = window.confirm('Delete this newsletter? This cannot be undone.')
    if (!ok) return
    try {
      await del.mutateAsync({ newsfeedId: id })
    } catch {
      // optional toast
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type='button'
          onClick={onClick}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick?.() }}
          className='text-left w-full'
          aria-label={title}
        >
          <Card
            style={{ backgroundColor: bgColor }}
            className={cn(
              'rounded-xl h-24 transition hover:shadow-sm hover:ring-2 hover:ring-secondary/20 hover:border-secondary/60',
              active && ringWhenActive,
              (generating || del.isPending) && 'pointer-events-none',
              'bg-transparent border'
            )}
          >
            <CardContent className='h-full flex items-center justify-center px-4'>
              <div className='w-full max-w-[92%] space-y-1'>
                <div className={cn('font-medium truncate', textClass)}>{title}</div>
                <div className={cn('text-xs font-mono truncate', subTextClass)}>
                  {subtitle}
                </div>

                {/* progress bar when generating */}
                {generating && typeof pct === 'number' && (
                  <div className='h-1 w-full rounded bg-black/10 overflow-hidden'>
                    <div
                      className='h-full rounded bg-black/30 transition-[width]'
                      style={{ width: `${pct}%` }}
                      aria-hidden='true'
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent className='w-48'>
        <ContextMenuItem
          inset
          onSelect={() => onClick?.()}
          disabled={!!generating}
        >
          <HugeiconsIcon icon={Folder02Icon} className='mr-2 size-4' strokeWidth={2} />
          Open
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          inset
          className='text-destructive focus:text-destructive'
          onSelect={handleDelete}
          disabled={!!generating || del.isPending}
        >
          <HugeiconsIcon icon={Delete02Icon} className='mr-2 size-4' strokeWidth={2} />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

/* utils */

function formatElapsed(totalSec: number) {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`
}