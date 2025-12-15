import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { CircleIcon, Cursor02Icon, DiamondIcon, FitToScreenIcon, Hold04Icon, LeftToRightListBulletIcon, MinusSignIcon, Note02Icon, PlusSignIcon, SquareIcon, SquareLock02Icon, SquareUnlock02Icon, TextIcon, Image02Icon, ChartBubble02Icon, GeometricShapes01Icon, Tag01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import type { AddNoteNodeOptions } from '../../hooks/add-node'
import { Separator } from '@/components/ui/separator'
import { ImageSearchDialog } from './utils/image-search'
import { IconSearchDialog } from './utils/icon-search'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChevronDown, Cloud, Layers } from 'lucide-react'
import type { NodeType } from '../../types/style'

type ViewMode = 'graph' | 'linear'

interface ActionPanelProps {
  onAddNode: (options: AddNoteNodeOptions) => void
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


/**
 * Action panel component for graph controls and node additions.
 */
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
  const [openImageSearch, setOpenImageSearch] = useState(false)

  const [openIconSearch, setOpenIconSearch] = useState(false)
  const handleAddShape = (nodeType: NodeType) => onAddNode({ nodeType })

  const shapeOptions: { nodeType: NodeType, label: string, icon: ReactNode }[] = [
    { nodeType: 'rectangle', label: 'Rectangle', icon: <HugeiconsIcon icon={SquareIcon} className='size-4 shrink-0' strokeWidth={2} /> },
    { nodeType: 'layered-rectangle', label: 'Layered card', icon: <Layers className='w-4 h-4 shrink-0' /> },
    { nodeType: 'ellipse', label: 'Ellipse', icon: <HugeiconsIcon icon={CircleIcon} className='size-4 shrink-0' strokeWidth={2} /> },
    { nodeType: 'diamond', label: 'Diamond', icon: <HugeiconsIcon icon={DiamondIcon} className='size-4 shrink-0' strokeWidth={2} /> },
    { nodeType: 'thought-cloud', label: 'Cloud', icon: <Cloud className='w-4 h-4 shrink-0' /> },
    { nodeType: 'capsule', label: 'Capsule', icon: <HugeiconsIcon icon={Tag01Icon} className='size-4 shrink-0' strokeWidth={2} /> },
  ]

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


  return (
    <div
      className={`
        absolute z-50 border border-border shadow-md
        backdrop-blur-md supports-[backdrop-filter]:bg-sidebar/80 backdrop-saturate-150
        bg-sidebar text-sidebar-foreground rounded-xl
        p-1 flex gap-1
        right-2 top-1/2 -translate-y-1/2 md:translate-y-0
        flex-col items-stretch
        md:right-auto md:left-1/2 md:top-2 md:-translate-x-1/2
        md:flex-row md:items-center
      `}
      role='toolbar'
      aria-label='Graph actions'
    >
      {/* View mode toggle */}
      <ModeButton mode='graph' label='Graph'>
        <HugeiconsIcon icon={ChartBubble02Icon} className='size-4 shrink-0' strokeWidth={2} />
        <span className='text-xs font-normal sr-only sm:not-sr-only'>Graph</span>
      </ModeButton>

      <ModeButton mode='linear' label='Linear'>
        <HugeiconsIcon icon={LeftToRightListBulletIcon} className='size-4 shrink-0' strokeWidth={2} />
        <span className='text-xs font-normal sr-only sm:not-sr-only'>List</span>
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

          {/* Shape picker */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={null}
                className={normalButtonClass}
                size='icon'
                title='Add shape'
                aria-label='Add shape'
              >
                <div className='flex flex-col items-center gap-0.5 relative'>
                  <HugeiconsIcon icon={SquareIcon} className='size-4 shrink-0' strokeWidth={2} />
                  <ChevronDown className='absolute inset-x-0 -bottom-3.5 w-3 h-3 text-muted-foreground' />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='center' side='bottom' sideOffset={8} className='min-w-[180px]'>
              {shapeOptions.map(option => (
                <DropdownMenuItem
                  key={option.nodeType}
                  onSelect={() => handleAddShape(option.nodeType)}
                  className='gap-2 text-sm'
                >
                  {option.icon}
                  <span>{option.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

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

          {/* Icon search */}
          <Button
            variant={null}
            className={normalButtonClass}
            size='icon'
            onClick={() => setOpenIconSearch(true)}
            title='Search icons'
            aria-label='Search icons'
          >
            <HugeiconsIcon icon={GeometricShapes01Icon} className='size-4 shrink-0' strokeWidth={2} />
          </Button>

          {/* Image search */}
          <Button
            variant={null}
            className={normalButtonClass}
            size='icon'
            onClick={() => setOpenImageSearch(true)}
            title='Search images'
            aria-label='Search images'
          >
            <HugeiconsIcon icon={Image02Icon} className='size-4 shrink-0' strokeWidth={2} />
          </Button>
        </>
      )}

      {/* -- LINEAR MODE CONTROLS -- */}
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

      {/* Dialogs */}
      <ImageSearchDialog openImageSearch={openImageSearch} setOpenImageSearch={setOpenImageSearch} />
      <IconSearchDialog openIconSearch={openIconSearch} setOpenIconSearch={setOpenIconSearch} />
    </div>
  )
}
