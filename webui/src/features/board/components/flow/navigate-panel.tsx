import { memo, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { HugeiconsIcon } from '@hugeicons/react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  ChartBubble02Icon,
  Cursor02Icon,
  DragDropHorizontalIcon,
  FitToScreenIcon,
  GridIcon,
  Hold04Icon,
  LeftToRightListBulletIcon,
  MinusSignIcon,
  PlusSignIcon,
  Redo03Icon,
  SquareLock02Icon,
  SquareUnlock02Icon,
  Undo03Icon,
} from '@hugeicons/core-free-icons'
import { BitcoinPresentationIcon } from '@hugeicons/core-free-icons'
import clsx from 'clsx'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { TAILWIND_50 } from '@/features/board/lib/colors/tailwind'
import { useTheme } from '@/components/theme-provider'
import { darkModeDisplayHex } from '@/features/board/lib/colors/dark-variants'
import { applyBackgroundAlpha, type BoardBackgroundTexture } from '@/features/board/utils/board-background'

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
  onToggleSlidesPanel: () => void
  slidesPanelOpen: boolean
  onBoardBackgroundChange: (color: string) => void
  onBoardBackgroundReset: () => void
  boardBackground: string | null
  boardBackgroundTexture: BoardBackgroundTexture | null
  onBoardBackgroundTextureChange: (texture: BoardBackgroundTexture | null) => void
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
  onToggleSlidesPanel,
  slidesPanelOpen,
  onBoardBackgroundChange,
  onBoardBackgroundReset,
  boardBackground,
  boardBackgroundTexture,
  onBoardBackgroundTextureChange,
}: NavigatePanelProps) {
  const [small, setSmall] = useState(false)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  useEffect(() => {
    const check = () => setSmall(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const normalButtonClass = `
    transition-colors
    text-card-foreground
    hover:bg-sidebar-primary hover:text-sidebar-primary-foreground
    p-2.5
    rounded-lg
    flex flex-row items-center justify-center gap-2
  `

  const activeButtonClass = clsx(
    normalButtonClass,
    'bg-sidebar-primary text-secondary',
  )

  const selectionModeButtonClass = enableSelection ? activeButtonClass : normalButtonClass
  const dragModeButtonClass = enableSelection ? normalButtonClass : activeButtonClass
  const tooltipSide = small ? 'left' : 'bottom'
  const colorOptions = useMemo(
    () =>
      [{ name: 'white', hex: '#ffffff' }, ...TAILWIND_50].map(option => ({
        ...option,
        resolved: isDark ? darkModeDisplayHex(option.hex) || option.hex : option.hex
      })),
    [isDark]
  )
  const textureOptions: Array<{ value: BoardBackgroundTexture | null; label: string }> = useMemo(
    () => [
      { value: null, label: 'None' },
      { value: 'lines', label: 'Lines' },
      { value: 'dots', label: 'Dots' },
    ],
    [],
  )

  const tooltipCopy = {
    pan: {
      title: 'Pan mode',
      description: 'Drag the canvas to move around.',
      shortcut: 'P',
    },
    select: {
      title: 'Selection mode',
      description: 'Click and drag to select nodes.',
      shortcut: 'V',
    },
    undo: {
      title: 'Undo',
      description: 'Revert the last change.',
      shortcut: 'Z',
    },
    redo: {
      title: 'Redo',
      description: 'Reapply the last change.',
      shortcut: 'Y',
    },
    zoomIn: {
      title: 'Zoom in',
      description: 'Zoom closer to the board.',
      shortcut: '+',
    },
    zoomOut: {
      title: 'Zoom out',
      description: 'Zoom further from the board.',
      shortcut: '-',
    },
    reset: {
      title: 'Reset zoom',
      description: 'Return to 100% zoom.',
      shortcut: '0',
    },
    fit: {
      title: 'Fit view',
      description: 'Zoom to fit all content.',
      shortcut: 'F',
    },
    lock: {
      title: 'Lock canvas',
      description: 'Disable edits and dragging.',
      shortcut: 'L',
    },
    unlock: {
      title: 'Unlock canvas',
      description: 'Enable edits and dragging.',
      shortcut: 'L',
    },
    slides: {
      title: 'Slides',
      description: 'Open the slides panel.',
      shortcut: 'M',
    },
    background: {
      title: 'Board background',
      description: 'Pick a background color for this board.',
    },
    backgroundReset: {
      title: 'Reset background',
      description: 'Restore the default background.',
    },
    graph: {
      title: 'Graph view',
      description: 'Switch to the visual canvas view.',
    },
    linear: {
      title: 'Linear view',
      description: 'Switch to the list-based view.',
    },
  }

  const TooltipLabel = ({ title, description, shortcut }: { title: string; description: string; shortcut?: string }) => (
    <div className='flex flex-col gap-0.5'>
      <span className='text-xs font-semibold'>{title}</span>
      <span className='text-[11px] text-primary-foreground/80'>
        {description}
        {shortcut ? ` Shortcut: ${shortcut}` : ''}
      </span>
    </div>
  )

  const ModeButton = ({ mode, label, children }: { mode: ViewMode; label: string; children: React.ReactNode }) => {
    const active = viewMode === mode
    const size = small ? 'icon' : 'default'
    const tooltip = mode === 'graph' ? tooltipCopy.graph : tooltipCopy.linear

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={null}
            size={size}
            onClick={() => setViewMode(mode)}
            className={active ? activeButtonClass : normalButtonClass}
            aria-label={`${label} view`}
            aria-pressed={active}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide} sideOffset={10}>
          <TooltipLabel {...tooltip} />
        </TooltipContent>
      </Tooltip>
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={null}
                size='icon'
                onClick={() => setEnableSelection(!enableSelection)}
                className={dragModeButtonClass}
                aria-label='Pan mode'
              >
                <span className='relative inline-flex items-center justify-center'>
                  <HugeiconsIcon icon={Hold04Icon} className='size-4 shrink-0' />
                  <ShortcutHint label='P' />
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide} sideOffset={10}>
              <TooltipLabel {...tooltipCopy.pan} />
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={null}
                size='icon'
                onClick={() => setEnableSelection(!enableSelection)}
                className={selectionModeButtonClass}
                aria-label='Selection mode'
              >
                <span className='relative inline-flex items-center justify-center'>
                  <HugeiconsIcon icon={Cursor02Icon} className='size-4 shrink-0' strokeWidth={2} />
                  <ShortcutHint label='V' />
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide} sideOffset={10}>
              <TooltipLabel {...tooltipCopy.select} />
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={null}
                size='icon'
                onClick={undo}
                className={normalButtonClass}
                aria-label='Undo'
                disabled={!canUndo}
              >
                <span className='relative inline-flex items-center justify-center'>
                  <HugeiconsIcon icon={Undo03Icon} className='size-4 shrink-0' strokeWidth={2} />
                  <ShortcutHint label='Z' />
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide} sideOffset={10}>
              <TooltipLabel {...tooltipCopy.undo} />
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={null}
                size='icon'
                onClick={redo}
                className={normalButtonClass}
                aria-label='Redo'
                disabled={!canRedo}
              >
                <span className='relative inline-flex items-center justify-center'>
                  <HugeiconsIcon icon={Redo03Icon} className='size-4 shrink-0' strokeWidth={2} />
                  <ShortcutHint label='Y' />
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide} sideOffset={10}>
              <TooltipLabel {...tooltipCopy.redo} />
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={null}
                size='icon'
                onClick={onZoomIn}
                className={normalButtonClass}
                aria-label='Zoom in'
              >
                <span className='relative inline-flex items-center justify-center'>
                  <HugeiconsIcon icon={PlusSignIcon} className='size-4 shrink-0' strokeWidth={2} />
                  <ShortcutHint label='+' />
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide} sideOffset={10}>
              <TooltipLabel {...tooltipCopy.zoomIn} />
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={null}
                size='icon'
                onClick={onZoomOut}
                className={normalButtonClass}
                aria-label='Zoom out'
              >
                <span className='relative inline-flex items-center justify-center'>
                  <HugeiconsIcon icon={MinusSignIcon} className='size-4 shrink-0' strokeWidth={2} />
                  <ShortcutHint label='-' />
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide} sideOffset={10}>
              <TooltipLabel {...tooltipCopy.zoomOut} />
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={null}
                size='icon'
                onClick={onResetZoom}
                className={normalButtonClass}
                aria-label='Reset zoom to 100%'
              >
                <span className='relative inline-flex items-center justify-center text-xs font-medium text-secondary'>
                  {Math.round((zoom || 1) * 100)}%
                  <ShortcutHint label='0' />
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide} sideOffset={10}>
              <TooltipLabel {...tooltipCopy.reset} />
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={null}
                size='icon'
                onClick={onFitView}
                className={normalButtonClass}
                aria-label='Fit view'
              >
                <span className='relative inline-flex items-center justify-center'>
                  <HugeiconsIcon icon={FitToScreenIcon} className='size-4 shrink-0' strokeWidth={2} />
                  <ShortcutHint label='F' />
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide} sideOffset={10}>
              <TooltipLabel {...tooltipCopy.fit} />
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={null}
                size='icon'
                onClick={toggleLock}
                className={isLocked ? activeButtonClass : normalButtonClass}
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
            </TooltipTrigger>
            <TooltipContent side={tooltipSide} sideOffset={10}>
              <TooltipLabel {...(isLocked ? tooltipCopy.unlock : tooltipCopy.lock)} />
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={null}
                size='icon'
                onClick={onToggleSlidesPanel}
                className={slidesPanelOpen ? activeButtonClass : normalButtonClass}
                aria-label='Slides'
              >
                <span className='relative inline-flex items-center justify-center'>
                  <HugeiconsIcon icon={BitcoinPresentationIcon} className='size-4 shrink-0' strokeWidth={2} />
                  <ShortcutHint label='M' />
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide} sideOffset={10}>
              <TooltipLabel {...tooltipCopy.slides} />
            </TooltipContent>
          </Tooltip>

          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    variant={null}
                    size='icon'
                    type="button"
                    className={`${normalButtonClass} relative`}
                    aria-label="Board background"
                  >
                    <span className='relative inline-flex items-center justify-center'>
                      <span
                        className='w-4 h-4 rounded-full border-2 border-secondary/50'
                        style={{
                          backgroundColor: applyBackgroundAlpha(
                            isDark ? darkModeDisplayHex(boardBackground) || boardBackground : boardBackground,
                            0.5
                          ) || 'transparent'
                        }}
                      />
                    </span>
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side={tooltipSide} sideOffset={10}>
                <TooltipLabel {...tooltipCopy.background} />
              </TooltipContent>
            </Tooltip>
            <PopoverContent side="top" align="center" className="w-auto p-2">
              <div className='flex items-center justify-between px-1 text-[11px] font-medium text-muted-foreground'>
                <span>Color</span>
                <button
                  type="button"
                  className='text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-50'
                  onClick={onBoardBackgroundReset}
                  disabled={!boardBackground}
                >
                  Reset
                </button>
              </div>
              <div className='mt-1 grid grid-cols-10 gap-1'>
                {colorOptions.map(option => (
                  <button
                    key={option.name}
                    type="button"
                    className='h-5 w-5 rounded-full border border-border shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-secondary'
                    style={{ backgroundColor: option.resolved }}
                    title={`${option.name}-50`}
                    aria-label={`${option.name}-50`}
                    onClick={() => onBoardBackgroundChange(option.hex)}
                  />
                ))}
              </div>
              <div className='mt-3 flex items-center justify-between px-1 text-[11px] font-medium text-muted-foreground'>
                <span>Texture</span>
                <button
                  type="button"
                  className='text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-50'
                  onClick={() => onBoardBackgroundTextureChange(null)}
                  disabled={!boardBackgroundTexture}
                >
                  Reset
                </button>
              </div>
              <div className='mt-1 flex flex-wrap items-center justify-center gap-1'>
                {textureOptions.map(option => (
                  <button
                    key={option.label}
                    type="button"
                    className={clsx(
                      'h-7 w-7 rounded-md text-[8px] font-medium transition-colors flex items-center justify-center',
                      option.value === boardBackgroundTexture
                        ? 'bg-sidebar-primary text-secondary'
                        : 'bg-muted text-muted-foreground/50 hover:bg-muted/70'
                    )}
                    onClick={() => onBoardBackgroundTextureChange(option.value)}
                    aria-label={option.label}
                    title={option.label}
                  >
                    {option.value === 'lines' ? (
                      <HugeiconsIcon icon={GridIcon} className="size-4" strokeWidth={2} />
                    ) : option.value === 'dots' ? (
                      <HugeiconsIcon icon={DragDropHorizontalIcon} className="size-4" strokeWidth={2} />
                    ) : (
                      'None'
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

        </>
      )}
    </div>
  )
})
