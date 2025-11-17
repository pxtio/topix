import * as React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { HugeiconsIcon } from '@hugeicons/react'
import { PlusSignIcon } from '@hugeicons/core-free-icons'

type Props = React.ComponentPropsWithoutRef<'button'>

export const CreateSubscriptionCardTrigger = React.forwardRef<HTMLButtonElement, Props>(
  ({ className, children, ...props }, ref) => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type='button'
              ref={ref}
              {...props}
              className={cn(
                'w-64 h-20 rounded-xl border-2 border-dashed border-border',
                'hover:border-secondary hover:ring-2 hover:ring-secondary/20 transition-colors cursor-pointer',
                'flex items-center justify-center bg-background',
                className
              )}
            >
              <HugeiconsIcon icon={PlusSignIcon} className='w-6 h-6 text-secondary' strokeWidth={2} />
              {children}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            Create New Topic
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
)

CreateSubscriptionCardTrigger.displayName = 'CreateSubscriptionCardTrigger'
