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

  const title = generating ? 'Generating…' : `Newsletter ${formatNewsletterDate(createdAt)}`
  const subtitle = generating ? 'Please wait' : new Date(createdAt).toLocaleString()

  const handleDelete = async () => {
    if (generating) return
    const ok = window.confirm('Delete this newsletter? This cannot be undone.')
    if (!ok) return
    try {
      await del.mutateAsync({ newsfeedId: id })
    } catch {
      // you can plug a toast here if you have one
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
            className={cn(
              'rounded-xl h-24 transition hover:shadow-sm hover:bg-accent hover:border-secondary hover:ring-2 hover:ring-secondary/20',
              active && 'ring-2 ring-secondary/40 border-secondary bg-accent',
              (generating || del.isPending) && 'animate-pulse pointer-events-none'
            )}
          >
            <CardContent className='h-full flex items-center text-center justify-center px-4'>
              <div className='space-y-1'>
                <div className='font-medium'>{title}</div>
                <div className='text-xs text-muted-foreground font-mono'>{subtitle}</div>
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
          <HugeiconsIcon icon={Folder02Icon} className='mr-2 size-4' strokeWidth={1.75} />
          Open
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          inset
          className='text-destructive focus:text-destructive'
          onSelect={handleDelete}
          disabled={!!generating || del.isPending}
        >
          <HugeiconsIcon icon={Delete02Icon} className='mr-2 size-4' strokeWidth={1.75} />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
