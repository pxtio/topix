import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { HugeiconsIcon } from '@hugeicons/react'
import { PlusSignIcon } from '@hugeicons/core-free-icons'
import { useCreateNewsfeed } from '@/features/newsfeed/api/create-newsfeed'
import { generateUuid } from '@/lib/common'

export function CreateNewsfeedTile({
  subscriptionId,
  onStart
}: {
  subscriptionId?: string
  onStart?: (uid: string) => void
}) {
  const create = useCreateNewsfeed(subscriptionId)
  const pending = create.isPending

  const handleClick = () => {
    if (!subscriptionId || pending) return
    const uid = generateUuid()
    onStart?.(uid)            // tell parent which id is "generating"
    create.mutate({ uid })    // optimistic insert is handled in the hook
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type='button'
            onClick={handleClick}
            disabled={!subscriptionId || pending}
            className='text-left'
            aria-label='Create Newsfeed'
          >
            <Card
              className={cn(
                'rounded-xl h-24 transition border-2 border-dashed border-border hover:border-secondary/60',
                pending && 'opacity-70 pointer-events-none'
              )}
            >
              <CardContent className='h-full flex items-center justify-center'>
                <div className='flex items-center justify-center w-10 h-10 rounded-full bg-muted'>
                  <HugeiconsIcon icon={PlusSignIcon} className='size-5' strokeWidth={1.75} />
                </div>
              </CardContent>
            </Card>
          </button>
        </TooltipTrigger>
        <TooltipContent side='top' align='center'>
          Create Newsfeed
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}