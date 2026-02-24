import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import { GridIcon, More01Icon, Redo03Icon, SquareLock02Icon, SquareUnlock02Icon, Undo03Icon } from '@hugeicons/core-free-icons'
import clsx from 'clsx'
import type { Viewport } from '@xyflow/react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTheme } from '@/components/theme-provider'

import type { NoteNode } from '../../types/flow'
import { NavigableMiniMap } from './navigable-minimap'
import { applyBackgroundAlpha, type BoardBackgroundTexture } from '../../utils/board-background'
import { darkModeDisplayHex } from '../../lib/colors/dark-variants'
import { TAILWIND_50 } from '../../lib/colors/tailwind'


type Props = {
  nodes: NoteNode[]
  onNavigate: (target: { x: number; y: number }, currentZoom: number) => void
  getCurrentViewport: () => Viewport | null
  onResetZoom: () => void
  zoom: number
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  isLocked: boolean
  toggleLock: () => void
  boardBackground: string | null
  boardBackgroundTexture: BoardBackgroundTexture | null
  onBoardBackgroundChange: (color: string) => void
  onBoardBackgroundReset: () => void
  onBoardBackgroundTextureChange: (texture: BoardBackgroundTexture | null) => void
}


export const ViewportControls = memo(function ViewportControls({
  nodes,
  onNavigate,
  getCurrentViewport,
  onResetZoom,
  zoom,
  undo,
  redo,
  canUndo,
  canRedo,
  isLocked,
  toggleLock,
  boardBackground,
  boardBackgroundTexture,
  onBoardBackgroundChange,
  onBoardBackgroundReset,
  onBoardBackgroundTextureChange,
}: Props) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const controlButtonClass = 'transition-colors text-card-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground p-2 rounded-md'
  const textureOptions: Array<{ value: BoardBackgroundTexture | null; label: string }> = [
    { value: null, label: 'None' },
    { value: 'lines', label: 'Lines' },
    { value: 'dots', label: 'Dots' },
  ]
  const colorOptions = [{ name: 'white', hex: '#ffffff' }, ...TAILWIND_50].map(option => ({
    ...option,
    resolved: isDark ? darkModeDisplayHex(option.hex) || option.hex : option.hex,
  }))

  return (
    <div className='absolute bottom-4 left-4 z-50 flex flex-col gap-2'>
      <NavigableMiniMap
        nodes={nodes}
        wrapperClassName='relative'
        onNavigate={onNavigate}
        getCurrentViewport={getCurrentViewport}
      />
      <div className='rounded-lg bg-sidebar/90 backdrop-blur-md p-1 flex items-center gap-1'>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={null}
              size='icon'
              onClick={onResetZoom}
              className={controlButtonClass}
              aria-label='Reset zoom to 100%'
            >
              <span className='text-xs font-medium text-secondary min-w-[2.4rem] text-center'>
                {Math.round((zoom || 1) * 100)}%
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side='right' sideOffset={10}>
            Reset zoom (0) | Zoom in/out (+/-)
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={null}
              size='icon'
              onClick={undo}
              className={clsx(controlButtonClass, !canUndo && 'opacity-50 pointer-events-none')}
              aria-label='Undo'
              disabled={!canUndo}
            >
              <HugeiconsIcon icon={Undo03Icon} className='size-4 shrink-0' strokeWidth={2} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side='right' sideOffset={10}>
            Undo (Cmd/Ctrl+Z)
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={null}
              size='icon'
              onClick={redo}
              className={clsx(controlButtonClass, !canRedo && 'opacity-50 pointer-events-none')}
              aria-label='Redo'
              disabled={!canRedo}
            >
              <HugeiconsIcon icon={Redo03Icon} className='size-4 shrink-0' strokeWidth={2} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side='right' sideOffset={10}>
            Redo (Cmd/Ctrl+Y or Cmd/Ctrl+Shift+Z)
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={null}
              size='icon'
              onClick={toggleLock}
              className={controlButtonClass}
              aria-label={isLocked ? 'Unlock canvas' : 'Lock canvas'}
            >
              {isLocked ? (
                <HugeiconsIcon icon={SquareLock02Icon} className='size-4 shrink-0' strokeWidth={2} />
              ) : (
                <HugeiconsIcon icon={SquareUnlock02Icon} className='size-4 shrink-0' strokeWidth={2} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side='right' sideOffset={10}>
            {isLocked ? 'Unlock canvas (L)' : 'Lock canvas (L)'}
          </TooltipContent>
        </Tooltip>
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant={null} size='icon' type='button' className={controlButtonClass} aria-label='Board background'>
                  <span
                    className='w-4 h-4 rounded-full border-2 border-secondary/50'
                    style={{
                      backgroundColor: applyBackgroundAlpha(
                        isDark ? darkModeDisplayHex(boardBackground) || boardBackground : boardBackground,
                        0.5
                      ) || 'transparent',
                    }}
                  />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side='right' sideOffset={10}>
              Background style
            </TooltipContent>
          </Tooltip>
          <PopoverContent side='right' align='start' className='w-auto p-2'>
            <div className='flex items-center justify-between px-1 text-[11px] font-medium text-muted-foreground'>
              <span>Color</span>
              <button
                type='button'
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
                  type='button'
                  className='h-5 w-5 rounded-full border border-border shadow-sm transition hover:brightness-95'
                  style={{ backgroundColor: option.resolved }}
                  aria-label={`${option.name}-50`}
                  onClick={() => onBoardBackgroundChange(option.hex)}
                />
              ))}
            </div>
            <div className='mt-3 flex items-center justify-between px-1 text-[11px] font-medium text-muted-foreground'>
              <span>Texture</span>
              <button
                type='button'
                className='text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-50'
                onClick={() => onBoardBackgroundTextureChange(null)}
                disabled={!boardBackgroundTexture}
              >
                Reset
              </button>
            </div>
            <div className='mt-1 flex items-center justify-center gap-1'>
              {textureOptions.map(option => (
                <button
                  key={option.label}
                  type='button'
                  className={clsx(
                    'h-7 w-7 rounded-md text-[8px] font-medium transition-colors flex items-center justify-center',
                    option.value === boardBackgroundTexture
                      ? 'bg-sidebar-primary text-secondary'
                      : 'bg-muted text-muted-foreground/50 hover:bg-muted/70'
                  )}
                  onClick={() => onBoardBackgroundTextureChange(option.value)}
                  aria-label={option.label}
                >
                  {option.value === 'lines' ? (
                    <HugeiconsIcon icon={GridIcon} className='size-4' strokeWidth={2} />
                  ) : option.value === 'dots' ? (
                    <HugeiconsIcon icon={More01Icon} className='size-4' strokeWidth={2} />
                  ) : (
                    'None'
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
})
