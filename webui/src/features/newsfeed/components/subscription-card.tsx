import { Card, CardContent } from '@/components/ui/card'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import { cn } from '@/lib/utils'
import type { Subscription } from '../types/subscription'
import { TOPIC_DISPLAY, TOPIC_EMOJI, matchPredefined } from '../constants/topics'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon, NewReleasesIcon } from '@hugeicons/core-free-icons'
import { SquareDashedKanban } from '@/components/animate-ui/icons/square-dashed-kanban'


/**
 * A card that represents a subscription. Clicking the card triggers onClick.
 */
export function SubscriptionCard({
  sub,
  disabled,
  onClick,
  onDelete
}: {
  sub: Subscription
  disabled?: boolean
  onClick?: () => void
  onDelete?: () => void
}) {
  const title = sub.label?.markdown ?? ''
  const topicKey = matchPredefined(title)
  const label = topicKey ? TOPIC_DISPLAY[topicKey] : title || 'Subscription'

  const handleDelete = () => {
    if (!onDelete) return
    onDelete()
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card
          className={cn(
            'w-56 h-20 justify-center items-center flex rounded-xl transition shadow-none hover:shadow hover:border-secondary hover:ring-2 hover:ring-secondary/20 md:w-64 p-0 overflow-hidden cursor-pointer',
            disabled && 'opacity-60'
          )}
        >
          <CardContent className='p-0 w-full h-full'>
            <button
              type='button'
              className={cn(
                'transition-all w-full !h-full p-2 hover:bg-accent flex flex-row items-center justify-center gap-2',
                disabled ? 'animate-pulse' : ''
              )}
              onClick={onClick}
              title={label}
            >
              {
                disabled ? (
                  <SquareDashedKanban animate animation="default" loop speed={2} className='size-4 text-foreground/50' strokeWidth={1.75} />
                ): (
                  <HugeiconsIcon
                    icon={topicKey ? TOPIC_EMOJI[topicKey] : NewReleasesIcon}
                    className='w-5 h-5 text-muted-foreground flex-shrink-0'
                    strokeWidth={1.5}
                  />
                )
              }
              <span className='truncate text-base font-medium'>
                {label}
              </span>
            </button>
          </CardContent>
        </Card>
      </ContextMenuTrigger>

      <ContextMenuContent className='w-40'>
        <ContextMenuItem
          onClick={handleDelete}
          className='text-destructive focus:text-destructive'
        >
          <HugeiconsIcon icon={Delete02Icon} className='w-4 h-4 mr-2' strokeWidth={1.75} />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export function SubscriptionCardLoading({
  text = 'Creating subscription…'
}: { text?: string }) {
  return (
    <Card className='w-56 h-20 md:w-64 rounded-xl shadow-sm'>
      <CardContent className='p-0 w-full h-full'>
        <div className='w-full h-full rounded-xl flex items-center gap-3 px-4 animate-pulse bg-gradient-to-r from-muted/40 via-muted/60 to-muted/40'>
          <div className='w-6 h-6 bg-transparent' />
          <div className='flex-1 h-4 bg-transparent' />
          <span className='sr-only'>{text}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function NewsfeedGeneratingCard() {
  return (
    <Card className='w-56 h-20 md:w-64 rounded-xl shadow-sm'>
      <CardContent className='p-0 w-full h-full'>
        <div className='w-full h-full rounded-xl flex items-center justify-center gap-2 px-4'>
          <span className='text-sm text-muted-foreground'>Generating newsfeed</span>
          <Dots />
        </div>
      </CardContent>
    </Card>
  )
}

function Dots() {
  return (
    <div className='flex gap-1'>
      <span className='w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:-0.2s]' />
      <span className='w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:-0.1s]' />
      <span className='w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-bounce' />
    </div>
  )
}