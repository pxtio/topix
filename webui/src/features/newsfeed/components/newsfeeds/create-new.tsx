import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { HugeiconsIcon } from '@hugeicons/react'
import { PlusSignIcon } from '@hugeicons/core-free-icons'
import { useCreateNewsfeed } from '@/features/newsfeed/api/create-newsfeed'
import { generateUuid } from '@/lib/common'

/**
 * A tile button to create a new newsfeed (no tooltip).
 */
export function CreateNewsfeedTile({
  subscriptionId,
  onStart
}: {
  subscriptionId?: string
  onStart?: (id: string) => void
}) {
  const create = useCreateNewsfeed(subscriptionId)
  const pending = create.isPending

  const handleClick = () => {
    if (!subscriptionId || pending) return
    const uid = generateUuid()
    onStart?.(uid)          // let parent mark as pending & stay on history
    create.mutate({ uid })  // optimistic insert handled by the mutation hook
  }

  return (
    <button
      type='button'
      onClick={handleClick}
      disabled={!subscriptionId || pending}
      className='text-left w-full'
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
            <HugeiconsIcon icon={PlusSignIcon} className='size-5 text-secondary' strokeWidth={2} />
          </div>
        </CardContent>
      </Card>
    </button>
  )
}