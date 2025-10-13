import * as React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

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
                'w-56 h-20 md:w-64 rounded-xl border-2 border-dashed border-border',
                'hover:border-secondary hover:ring-2 hover:ring-secondary/20 transition-colors cursor-pointer',
                'flex items-center justify-center bg-background',
                className
              )}
            >
              <Plus className='w-6 h-6 text-muted-foreground' />
              {children}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            Create New Subscription
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
)

CreateSubscriptionCardTrigger.displayName = 'CreateSubscriptionCardTrigger'
