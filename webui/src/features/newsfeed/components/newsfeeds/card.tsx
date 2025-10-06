import { cn } from "@/lib/utils"
import { formatNewsletterDate } from "../../utils/date"
import { Card, CardContent } from "@/components/ui/card"

export function NewsletterCard({
  createdAt,
  onClick,
  active
}: {
  createdAt: string
  onClick?: () => void
  active?: boolean
}) {
  const title = `Newsletter ${formatNewsletterDate(createdAt)}`
  const subtitle = new Date(createdAt).toLocaleString()

  return (
    <button
      type='button'
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick?.() }}
      className='text-left'
      aria-label={title}
    >
      <Card
        className={cn(
          'rounded-xl h-24 transition hover:shadow-sm hover:bg-accent hover:border-secondary hover:ring-2 hover:ring-secondary/20',
          active && 'ring-2 ring-secondary/40 border-secondary bg-accent'
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
  )
}