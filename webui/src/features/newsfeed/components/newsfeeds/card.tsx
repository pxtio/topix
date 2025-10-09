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
  generating
}: {
  id: string
  subscriptionId: string
  createdAt: string
  onClick?: () => void
  active?: boolean
  generating?: boolean
}) {
  const del = useDeleteNewsfeed(subscriptionId)

  // deterministic bg from date (shade 100)
  const { hex } = dateToTailwindColor(createdAt, 100)
  const base = toBaseHex(hex) ?? '#f5f5f5'

  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const bgColor = isDark ? darkModeDisplayHex(base) ?? '#f5f5f5' : base
  const lum = getLuminance(bgColor)


  // simple contrast heuristic
  const textClass = lum > 0.7 ? 'text-slate-900' : 'text-slate-50'
  const subTextClass = lum > 0.7 ? 'text-slate-700' : 'text-slate-100/80'
  const ringWhenActive = 'ring-2 ring-secondary/40 border-secondary'

  const title = generating ? 'Generating…' : `Newsletter ${formatNewsletterDate(createdAt)}`
  const subtitle = generating ? 'Please wait' : new Date(createdAt).toLocaleString()

  const handleDelete = async () => {
    if (generating) return
    const ok = window.confirm('Delete this newsletter? This cannot be undone.')
    if (!ok) return
    try {
      await del.mutateAsync({ newsfeedId: id })
    } catch {
      // plug a toast if desired
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
              (generating || del.isPending) && 'animate-pulse pointer-events-none',
              // remove default card bg to show our color fully
              'bg-transparent border'
            )}
          >
            <CardContent className='h-full flex items-center text-center justify-center px-4'>
              <div className='space-y-1'>
                <div className={cn('font-medium', textClass)}>{title}</div>
                <div className={cn('text-xs font-mono', subTextClass)}>{subtitle}</div>
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