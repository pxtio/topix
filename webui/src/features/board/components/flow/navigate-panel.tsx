import { memo, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ChartBubble02Icon,
  Cursor02Icon,
  FitToScreenIcon,
  Hold04Icon,
  LeftToRightListBulletIcon,
  MinusSignIcon,
  PlusSignIcon,
  Redo03Icon,
  SquareLock02Icon,
  SquareUnlock02Icon,
  Undo03Icon,
} from '@hugeicons/core-free-icons'
import clsx from 'clsx'

type ViewMode = 'graph' | 'linear'

export interface NavigatePanelProps {
  enableSelection: boolean
  setEnableSelection: (mode: boolean) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
  onResetZoom: () => void
  isLocked: boolean
  toggleLock: () => void
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  zoom: number
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

export const NavigatePanel = memo(function NavigatePanel({
  enableSelection,
  setEnableSelection,
  onZoomIn,
  onZoomOut,
  onFitView,
  onResetZoom,
  isLocked,
  toggleLock,
  viewMode,
  setViewMode,
  zoom,
  undo,
  redo,
  canUndo,
  canRedo,
}: NavigatePanelProps) {
  const normalButtonClass = `
    transition-colors
    text-card-foreground
    hover:bg-sidebar-primary hover:text-sidebar-primary-foreground
    p-4
    rounded-lg
    flex flex-row items-center justify-center gap-2
  `

  const activeButtonClass = clsx(
    normalButtonClass,
    'bg-sidebar-primary text-secondary',
  )

  const selectionModeButtonClass = enableSelection ? activeButtonClass : normalButtonClass
  const dragModeButtonClass = enableSelection ? normalButtonClass : activeButtonClass

  const ModeButton = ({ mode, label, children }: { mode: ViewMode; label: string; children: React.ReactNode }) => {
    const active = viewMode === mode
    const [small, setSmall] = useState(false)

    useEffect(() => {
      const check = () => setSmall(window.innerWidth < 640)
      check()
      window.addEventListener('resize', check)
      return () => window.removeEventListener('resize', check)
    }, [])

    const size = small ? 'icon' : 'default'

    return (
      <Button
        variant={null}
        size={size}
        onClick={() => setViewMode(mode)}
        className={active ? activeButtonClass : normalButtonClass}
        title={`${label} view`}
        aria-label={`${label} view`}
        aria-pressed={active}
      >
        {children}
      </Button>
    )
  }

  const ShortcutHint = ({ label }: { label: string }) => (
    <span className='pointer-events-none absolute -bottom-1 -right-1 text-[9px] leading-none text-muted-foreground/80'>
      {label}
    </span>
  )

  return (
    <div
      className={`
        absolute z-50 border border-border shadow-md
        backdrop-blur-md supports-[backdrop-filter]:bg-sidebar/80 backdrop-saturate-150
        bg-sidebar text-sidebar-foreground rounded-xl
        p-1 flex gap-1
        right-2 -translate-x-0 -translate-y-1/2 top-1/2
        flex-col items-center
        w-auto
        md:left-1/2 md:top-2 md:-translate-x-1/2 md:flex-row md:items-center md:justify-center md:right-auto
        md:-translate-y-0
      `}
      role='toolbar'
      aria-label='Navigation controls'
    >
      <ModeButton mode='graph' label='Graph'>
        <HugeiconsIcon icon={ChartBubble02Icon} className='size-4 shrink-0' strokeWidth={2} />
        <span className='text-xs font-medium sr-only sm:not-sr-only'>Graph</span>
      </ModeButton>

      <ModeButton mode='linear' label='Linear'>
        <HugeiconsIcon icon={LeftToRightListBulletIcon} className='size-4 shrink-0' strokeWidth={2} />
        <span className='text-xs font-medium sr-only sm:not-sr-only'>List</span>
      </ModeButton>

      <Separator orientation="vertical" className='md:!h-6 hidden md:block' />

      {viewMode === 'graph' && (
        <>
          <Button
            variant={null}
            size='icon'
            onClick={() => setEnableSelection(!enableSelection)}
            className={dragModeButtonClass}
            title='Pan mode'
            aria-label='Pan mode'
          >
            <span className='relative inline-flex items-center justify-center'>
              <HugeiconsIcon icon={Hold04Icon} className='size-4 shrink-0' />
              <ShortcutHint label='P' />
            </span>
          </Button>
          <Button
            variant={null}
            size='icon'
            onClick={() => setEnableSelection(!enableSelection)}
            className={selectionModeButtonClass}
            title='Selection mode'
            aria-label='Selection mode'
          >
            <span className='relative inline-flex items-center justify-center'>
              <HugeiconsIcon icon={Cursor02Icon} className='size-4 shrink-0' strokeWidth={2} />
              <ShortcutHint label='V' />
            </span>
          </Button>

          <Button
            variant={null}
            size='icon'
            onClick={undo}
            className={normalButtonClass}
            title='Undo'
            aria-label='Undo'
            disabled={!canUndo}
          >
            <span className='relative inline-flex items-center justify-center'>
              <HugeiconsIcon icon={Undo03Icon} className='size-4 shrink-0' strokeWidth={2} />
              <ShortcutHint label='Z' />
            </span>
          </Button>
          <Button
            variant={null}
            size='icon'
            onClick={redo}
            className={normalButtonClass}
            title='Redo'
            aria-label='Redo'
            disabled={!canRedo}
          >
            <span className='relative inline-flex items-center justify-center'>
              <HugeiconsIcon icon={Redo03Icon} className='size-4 shrink-0' strokeWidth={2} />
              <ShortcutHint label='Y' />
            </span>
          </Button>

          <Button
            variant={null}
            size='icon'
            onClick={onZoomIn}
            className={normalButtonClass}
            title='Zoom in'
            aria-label='Zoom in'
          >
            <span className='relative inline-flex items-center justify-center'>
              <HugeiconsIcon icon={PlusSignIcon} className='size-4 shrink-0' strokeWidth={2} />
              <ShortcutHint label='+' />
            </span>
          </Button>
          <Button
            variant={null}
            size='icon'
            onClick={onZoomOut}
            className={normalButtonClass}
            title='Zoom out'
            aria-label='Zoom out'
          >
            <span className='relative inline-flex items-center justify-center'>
              <HugeiconsIcon icon={MinusSignIcon} className='size-4 shrink-0' strokeWidth={2} />
              <ShortcutHint label='-' />
            </span>
          </Button>
          <Button
            variant={null}
            size='icon'
            onClick={onResetZoom}
            className={normalButtonClass}
            title='Reset zoom to 100%'
            aria-label='Reset zoom to 100%'
          >
            <span className='relative inline-flex items-center justify-center text-xs font-medium text-secondary'>
              {Math.round((zoom || 1) * 100)}%
              <ShortcutHint label='0' />
            </span>
          </Button>
          <Button
            variant={null}
            size='icon'
            onClick={onFitView}
            className={normalButtonClass}
            title='Fit view'
            aria-label='Fit view'
          >
            <span className='relative inline-flex items-center justify-center'>
              <HugeiconsIcon icon={FitToScreenIcon} className='size-4 shrink-0' strokeWidth={2} />
              <ShortcutHint label='F' />
            </span>
          </Button>

          <Button
            variant={null}
            size='icon'
            onClick={toggleLock}
            className={isLocked ? activeButtonClass : normalButtonClass}
            title={isLocked ? 'Unlock canvas' : 'Lock canvas'}
            aria-pressed={isLocked}
            aria-label={isLocked ? 'Unlock canvas' : 'Lock canvas'}
          >
            <span className='relative inline-flex items-center justify-center'>
              {isLocked ? (
                <HugeiconsIcon icon={SquareLock02Icon} className='size-4 shrink-0' strokeWidth={2} />
              ) : (
                <HugeiconsIcon icon={SquareUnlock02Icon} className='size-4 shrink-0' strokeWidth={2} />
              )}
              <ShortcutHint label='L' />
            </span>
          </Button>
        </>
      )}
    </div>
  )
})
