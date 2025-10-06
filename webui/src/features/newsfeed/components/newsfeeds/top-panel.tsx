import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { HugeiconsIcon } from '@hugeicons/react'
import { Clock02Icon, GridViewIcon, LeftToRightListBulletIcon } from '@hugeicons/core-free-icons'
import type { ViewMode } from '../../types/newsfeeds-view'

export function TopViewPanel({
  viewMode,
  setViewMode,
  hasLatest
}: {
  viewMode: ViewMode
  setViewMode: (m: ViewMode) => void
  hasLatest: boolean
}) {
  const normalButtonClass = `
    transition-colors
    text-card-foreground
    hover:bg-sidebar-primary hover:text-sidebar-primary-foreground
    p-3
    rounded-lg
  `
  const activeButtonClass = `
    ${normalButtonClass}
    bg-sidebar-primary text-sidebar-primary-foreground
  `

  const ModeButton = ({
    mode,
    label,
    icon,
    disabled
  }: {
    mode: ViewMode
    label: string
    icon: React.ReactNode
    disabled?: boolean
  }) => {
    const active = viewMode === mode
    const cls = active ? activeButtonClass : normalButtonClass
    return (
      <Button
        variant={null}
        size='icon'
        disabled={disabled}
        onClick={() => !disabled && setViewMode(mode)}
        className={cls}
        title={`${label} view`}
        aria-label={`${label} view`}
        aria-pressed={active}
      >
        {icon}
      </Button>
    )
  }

  return (
    <div
      className={`
        absolute z-50 border border-border shadow-md
        backdrop-blur-md supports-[backdrop-filter]:bg-card/80 backdrop-saturate-150
        bg-card text-card-foreground rounded-xl
        p-1 flex gap-1
        right-2 top-1/2 -translate-y-1/2 md:translate-y-0
        flex-col items-stretch
        md:right-auto md:left-1/2 md:top-4 md:-translate-x-1/2
        md:flex-row md:items-center
      `}
      role='toolbar'
      aria-label='Newsfeed view modes'
    >
      <ModeButton
        mode='grid'
        label='Grid'
        icon={<HugeiconsIcon icon={GridViewIcon} className='size-4 shrink-0' strokeWidth={1.75} />}
        disabled={!hasLatest}
      />
      <ModeButton
        mode='linear'
        label='Linear'
        icon={<HugeiconsIcon icon={LeftToRightListBulletIcon} className='size-4 shrink-0' strokeWidth={1.75} />}
        disabled={!hasLatest}
      />
      <Separator orientation='vertical' className='md:!h-6 hidden md:block' />
      <ModeButton
        mode='history'
        label='History'
        icon={<HugeiconsIcon icon={Clock02Icon} className='size-4 shrink-0' strokeWidth={1.75} />}
      />
    </div>
  )
}