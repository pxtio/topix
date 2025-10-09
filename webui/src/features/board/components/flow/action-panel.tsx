import { Button } from '@/components/ui/button'
import { ChartRelationshipIcon, CircleIcon, Cursor02Icon, DiamondIcon, FitToScreenIcon, GridViewIcon, Hold04Icon, LeftToRightListBulletIcon, MinusSignIcon, Note02Icon, PlusSignIcon, SquareIcon, SquareLock02Icon, SquareUnlock02Icon, TextIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import type { NodeType } from '../../types/style'
import { Separator } from '@/components/ui/separator'

type ViewMode = 'graph' | 'linear' | 'grid'

interface ActionPanelProps {
  onAddNode: ({ nodeType }: { nodeType: NodeType }) => void
  enableSelection: boolean
  setEnableSelection: (mode: boolean) => void

  // React Flow controls
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
  isLocked: boolean
  toggleLock: () => void

  // NEW
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
}

export function ActionPanel({
  onAddNode,
  enableSelection,
  setEnableSelection,
  onZoomIn,
  onZoomOut,
  onFitView,
  isLocked,
  toggleLock,
  viewMode,
  setViewMode
}: ActionPanelProps) {
  const normalButtonClass = `
    transition-colors
    text-card-foreground
    hover:bg-sidebar-primary hover:text-sidebar-primary-foreground
    p-4
    rounded-lg
  `

  const activeButtonClass = clsx(
    normalButtonClass,
    'bg-sidebar-primary text-sidebar-primary-foreground',
  )

  const selectionModeButtonClass = enableSelection ? activeButtonClass : normalButtonClass
  const dragModeButtonClass = enableSelection ? normalButtonClass : activeButtonClass

  const ModeButton = ({
    mode,
    label,
    children
  }: {
    mode: ViewMode
    label: string
    children: React.ReactNode
  }) => {
    const active = viewMode === mode
    return (
      <Button
        variant={null}
        size='icon'
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
      aria-label='Graph actions'
    >
      {/* View mode toggle */}
      <ModeButton mode='graph' label='Graph'>
        <HugeiconsIcon icon={ChartRelationshipIcon} className='size-4 shrink-0' strokeWidth={2} />
      </ModeButton>

      <ModeButton mode='linear' label='Linear'>
        <HugeiconsIcon icon={LeftToRightListBulletIcon} className='size-4 shrink-0' strokeWidth={2} />
      </ModeButton>

      <ModeButton mode='grid' label='Grid'>
        <HugeiconsIcon icon={GridViewIcon} className='size-4 shrink-0' strokeWidth={2} />
      </ModeButton>

      <Separator orientation="vertical" className='md:!h-6 hidden md:block' />

      {/* ——— GRAPH MODE CONTROLS ——— */}
      {viewMode === 'graph' && (
        <>
          {/* Pan / Select modes */}
          <Button
            variant={null}
            size='icon'
            onClick={() => setEnableSelection(!enableSelection)}
            className={dragModeButtonClass}
            title='Pan mode'
            aria-label='Pan mode'
          >
            <HugeiconsIcon icon={Hold04Icon} className='size-4 shrink-0' />
          </Button>
          <Button
            variant={null}
            size='icon'
            onClick={() => setEnableSelection(!enableSelection)}
            className={selectionModeButtonClass}
            title='Selection mode'
            aria-label='Selection mode'
          >
            <HugeiconsIcon icon={Cursor02Icon} className='size-4 shrink-0' strokeWidth={2} />
          </Button>

          {/* Zoom controls */}
          <Button
            variant={null}
            size='icon'
            onClick={onZoomIn}
            className={normalButtonClass}
            title='Zoom in'
            aria-label='Zoom in'
          >
            <HugeiconsIcon icon={PlusSignIcon} className='size-4 shrink-0' strokeWidth={2} />
          </Button>
          <Button
            variant={null}
            size='icon'
            onClick={onZoomOut}
            className={normalButtonClass}
            title='Zoom out'
            aria-label='Zoom out'
          >
            <HugeiconsIcon icon={MinusSignIcon} className='size-4 shrink-0' strokeWidth={2} />
          </Button>
          <Button
            variant={null}
            size='icon'
            onClick={onFitView}
            className={normalButtonClass}
            title='Fit view'
            aria-label='Fit view'
          >
            <HugeiconsIcon icon={FitToScreenIcon} className='size-4 shrink-0' strokeWidth={2} />
          </Button>

          {/* Lock / Unlock canvas */}
          <Button
            variant={null}
            size='icon'
            onClick={toggleLock}
            className={isLocked ? activeButtonClass : normalButtonClass}
            title={isLocked ? 'Unlock canvas' : 'Lock canvas'}
            aria-pressed={isLocked}
            aria-label={isLocked ? 'Unlock canvas' : 'Lock canvas'}
          >
            {isLocked ? (
              <HugeiconsIcon icon={SquareLock02Icon} className='size-4 shrink-0' strokeWidth={2} />
            ) : (
              <HugeiconsIcon icon={SquareUnlock02Icon} className='size-4 shrink-0' strokeWidth={2} />
            )}
          </Button>

          <Separator orientation="vertical" className='md:!h-6 hidden md:block' />

          {/* Add sheet */}
          <Button
            variant={null}
            className={normalButtonClass}
            size='icon'
            onClick={() => onAddNode({ nodeType: 'sheet' })}
            title='Add Sticky Note'
            aria-label='Add Sticky Note'
          >
            <HugeiconsIcon icon={Note02Icon} className='size-4 shrink-0' strokeWidth={2} />
          </Button>

          {/* Add rectangle */}
          <Button
            variant={null}
            className={normalButtonClass}
            size='icon'
            onClick={() => onAddNode({ nodeType: 'rectangle' })}
            title='Add Rectangle'
            aria-label='Add Rectangle'
          >
            <HugeiconsIcon icon={SquareIcon} className='size-4 shrink-0' strokeWidth={2} />
          </Button>

          {/* Add circle */}
          <Button
            variant={null}
            className={normalButtonClass}
            size='icon'
            onClick={() => onAddNode({ nodeType: 'ellipse' })}
            title='Add Ellipse'
            aria-label='Add Ellipse'
          >
            <HugeiconsIcon icon={CircleIcon} className='size-4 shrink-0' strokeWidth={2} />
          </Button>

          {/* Add diamond */}
          <Button
            variant={null}
            className={normalButtonClass}
            size='icon'
            onClick={() => onAddNode({ nodeType: 'diamond' })}
            title='Add Diamond'
            aria-label='Add Diamond'
          >
            <HugeiconsIcon icon={DiamondIcon} className='size-4 shrink-0' strokeWidth={2} />
          </Button>

          {/* Add text */}
          <Button
            variant={null}
            className={normalButtonClass}
            size='icon'
            onClick={() => onAddNode({ nodeType: 'text' })}
            title='Add Text'
            aria-label='Add Text'
          >
            <HugeiconsIcon icon={TextIcon} className='size-4 shrink-0' strokeWidth={2} />
          </Button>
        </>
      )}

      {/* ——— LINEAR MODE CONTROLS ——— */}
      {viewMode !== "graph" && (
        <>
          {/* Keep it simple in linear: only Add sheet */}
          <Button
            variant={null}
            className={normalButtonClass}
            size='icon'
            onClick={() => onAddNode({ nodeType: 'sheet' })}
            title='Add Sticky Note'
            aria-label='Add Sticky Note'
          >
            <HugeiconsIcon icon={Note02Icon} className='size-4 shrink-0' strokeWidth={2} />
          </Button>
        </>
      )}
    </div>
  )
}
