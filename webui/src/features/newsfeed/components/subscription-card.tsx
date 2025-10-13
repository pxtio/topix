// src/features/newsfeed/components/subscription-card.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import { cn } from '@/lib/utils'
import type { Subscription } from '../types/subscription'
import { TOPIC_DISPLAY, TOPIC_EMOJI, matchPredefined } from '../constants/topics'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon, PropertyNewIcon } from '@hugeicons/core-free-icons'
import { SquareDashedKanban } from '@/components/animate-ui/icons/square-dashed-kanban'


/**
 * A card representing a subscription, with optional progress if it's being created.
 */
export function SubscriptionCard({
  sub,
  onClick,
  onDelete,
  estimatedDurationSec = 20
}: {
  sub: Subscription
  onClick?: () => void
  onDelete?: () => void
  estimatedDurationSec?: number
}) {
  const title = sub.label?.markdown ?? ''
  const topicKey = matchPredefined(title)
  const label = topicKey ? TOPIC_DISPLAY[topicKey] : title || 'Subscription'
  const description = sub.properties?.rawDescription?.text

  const handleDelete = () => {
    if (!onDelete) return
    onDelete()
  }

  const startIsoRef = useRef<string | undefined>(undefined)
  if (sub.creating && !startIsoRef.current) {
    startIsoRef.current = sub.createdAt || new Date().toISOString()
  }
  const startMs = useMemo(
    () => (sub.creating && startIsoRef.current ? new Date(startIsoRef.current).getTime() : undefined),
    [sub.creating]
  )
  const [elapsedSec, setElapsedSec] = useState<number>(() =>
    startMs ? Math.max(0, Math.floor((Date.now() - startMs) / 1000)) : 0
  )

  useEffect(() => {
    if (!sub.creating || !startMs) return
    setElapsedSec(Math.max(0, Math.floor((Date.now() - startMs) / 1000)))
    const t = setInterval(() => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - startMs) / 1000)))
    }, 1000)
    return () => clearInterval(t)
  }, [sub.creating, startMs])

  const pct = useMemo(() => {
    if (!sub.creating || estimatedDurationSec <= 0) return undefined
    const v = Math.floor((elapsedSec / estimatedDurationSec) * 100)
    return Math.min(99, Math.max(0, v))
  }, [sub.creating, elapsedSec, estimatedDurationSec])

  const subtitle = useMemo(() => {
    if (!sub.creating) return undefined
    return `${formatElapsed(elapsedSec)}${typeof pct === 'number' ? ` • ${pct}%` : ''}`
  }, [sub.creating, elapsedSec, pct])

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card
          className={cn(
            'w-56 h-20 justify-center items-center flex rounded-xl transition shadow-none hover:shadow hover:border-secondary hover:ring-2 hover:ring-secondary/20 md:w-64 p-0 overflow-hidden cursor-pointer',
            sub.creating && 'bg-muted'
          )}
        >
          {/* 👈 allow children to shrink */}
          <CardContent className='relative p-0 w-full h-full min-w-0'>
            {sub.creating && typeof pct === 'number' && (
              <div className='absolute bottom-0 left-0 right-0 h-1.5 bg-foreground/10'>
                <div
                  className='h-full bg-foreground/40 transition-[width]'
                  style={{ width: `${pct}%` }}
                  aria-hidden='true'
                />
              </div>
            )}

            <button
              type='button'
              className={cn(
                'transition-all w-full !h-full p-2 hover:bg-accent flex flex-row items-center justify-start gap-2 min-w-0',
                sub.creating ? 'animate-pulse' : ''
              )}
              onClick={onClick}
              title={label}
            >

              {/* 👇 critical: basis-0 + min-w-0 + overflow-hidden */}
              <div className='flex flex-col items-start flex-1 basis-0 min-w-0 overflow-hidden'>
                <div className='flex flex-row items-center justify-center gap-2 w-full min-w-0'>
                  {sub.creating ? (
                    <SquareDashedKanban
                      animate
                      animation='default'
                      loop
                      speed={2}
                      className='size-5 text-foreground/50 flex-shrink-0'
                      strokeWidth={2}
                    />
                  ) : (
                    <HugeiconsIcon
                      icon={topicKey ? TOPIC_EMOJI[topicKey] : PropertyNewIcon}
                      className='w-5 h-5 text-muted-foreground flex-shrink-0'
                      strokeWidth={1.5}
                    />
                  )}
                  <span className='truncate text-base font-medium'>
                    {sub.creating ? 'Creating subscription…' : label}
                  </span>
                </div>
                {sub.creating && subtitle && (
                  <span className='text-xs text-muted-foreground font-mono truncate w-full'>
                    {subtitle}
                  </span>
                )}

                {!sub.creating && description && (
                  <span className='text-xs text-muted-foreground font-mono truncate w-full'>
                    {description}
                  </span>
                )}
              </div>
            </button>
          </CardContent>
        </Card>
      </ContextMenuTrigger>

      <ContextMenuContent className='w-40'>
        <ContextMenuItem
          onClick={handleDelete}
          className='text-destructive focus:text-destructive'
        >
          <HugeiconsIcon icon={Delete02Icon} className='w-4 h-4 mr-2' strokeWidth={2} />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

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