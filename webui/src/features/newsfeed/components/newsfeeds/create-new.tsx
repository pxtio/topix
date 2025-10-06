import { useCreateNewsfeed } from '../../api/create-newsfeed'
import { generateUuid } from '@/lib/common'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Card, CardContent } from '@/components/ui/card'
import { HugeiconsIcon } from '@hugeicons/react'
import { PlusSignIcon } from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'


// A tile button to create a new newsfeed
export function CreateNewsfeedTile({
  subscriptionId,
  onCreated
}: {
  subscriptionId?: string
  onCreated?: (id: string) => void
}) {
  const create = useCreateNewsfeed(subscriptionId)
  const pending = create.isPending

  const handleClick = () => {
    if (!subscriptionId || pending) return
    const uid = generateUuid()
    create.mutate(
      { uid },
      {
        onSuccess: nf => {
          // open the newly created one in linear view
          onCreated?.(nf.id)
        }
      }
    )
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
